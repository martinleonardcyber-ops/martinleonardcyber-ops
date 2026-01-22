#!/usr/bin/env python3
"""
Intrusion Detection Module
Detecte les tentatives d'intrusion et comportements suspects
"""

import os
import re
import time
import subprocess
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Set, Tuple
from dataclasses import dataclass, field
from collections import defaultdict
import logging

from .discord_webhook import DiscordWebhook, Alert, Severity

logger = logging.getLogger(__name__)


@dataclass
class ConnectionAttempt:
    """Tentative de connexion"""
    timestamp: datetime
    ip: str
    port: int
    success: bool
    user: Optional[str] = None


@dataclass
class IPThreatInfo:
    """Informations de menace pour une IP"""
    ip: str
    failed_attempts: int = 0
    successful_attempts: int = 0
    targeted_ports: Set[int] = field(default_factory=set)
    first_seen: datetime = None
    last_seen: datetime = None
    is_banned: bool = False
    threat_score: int = 0


class IntrusionDetector:
    """Detecteur d'intrusion"""

    def __init__(self, config: Dict[str, Any], webhook: DiscordWebhook):
        self.config = config
        self.webhook = webhook
        self.enabled = config.get("enabled", True)

        # Seuils de detection
        self.failed_login_threshold = config.get("failed_login_threshold", 5)
        self.failed_login_window = config.get("failed_login_window", 300)
        self.port_scan_threshold = config.get("port_scan_threshold", 20)
        self.port_scan_window = config.get("port_scan_window", 60)

        # Configuration
        self.whitelist = set(config.get("whitelist", ["127.0.0.1", "::1"]))
        self.critical_ports = set(config.get("critical_ports", [22, 80, 443]))

        # Tracking
        self.ip_info: Dict[str, IPThreatInfo] = {}
        self.connection_history: List[ConnectionAttempt] = []
        self.alerted_ips: Dict[str, datetime] = {}
        self.alert_cooldown = 600  # 10 minutes

        # Banned IPs (synchronise avec fail2ban si disponible)
        self.banned_ips: Set[str] = set()
        self._sync_banned_ips()

    def _sync_banned_ips(self):
        """Synchroniser avec fail2ban"""
        try:
            result = subprocess.run(
                ["fail2ban-client", "status", "sshd"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                # Extraire les IPs bannies
                for line in result.stdout.splitlines():
                    if "Banned IP" in line:
                        ips = line.split(":")[-1].strip().split()
                        self.banned_ips.update(ips)
                logger.debug(f"IPs bannies synchronisees: {len(self.banned_ips)}")
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        except Exception as e:
            logger.debug(f"Fail2ban non disponible: {e}")

    def _is_whitelisted(self, ip: str) -> bool:
        """Verifier si une IP est en whitelist"""
        return ip in self.whitelist

    def _get_ip_info(self, ip: str) -> IPThreatInfo:
        """Obtenir ou creer les infos de menace pour une IP"""
        if ip not in self.ip_info:
            self.ip_info[ip] = IPThreatInfo(ip=ip, first_seen=datetime.now())
        return self.ip_info[ip]

    def _cleanup_old_data(self):
        """Nettoyer les donnees anciennes"""
        cutoff = datetime.now() - timedelta(seconds=self.failed_login_window)

        # Nettoyer l'historique des connexions
        self.connection_history = [
            c for c in self.connection_history
            if c.timestamp > cutoff
        ]

        # Nettoyer les alertes expirées
        expired = [ip for ip, ts in self.alerted_ips.items()
                   if ts < cutoff]
        for ip in expired:
            del self.alerted_ips[ip]

    def _can_alert(self, ip: str) -> bool:
        """Verifier si on peut envoyer une alerte pour cette IP"""
        if ip in self.alerted_ips:
            if datetime.now() - self.alerted_ips[ip] < timedelta(seconds=self.alert_cooldown):
                return False
        return True

    def _mark_alerted(self, ip: str):
        """Marquer une IP comme alertee"""
        self.alerted_ips[ip] = datetime.now()

    def record_connection(self, ip: str, port: int, success: bool, user: str = None):
        """Enregistrer une tentative de connexion"""
        if self._is_whitelisted(ip):
            return

        attempt = ConnectionAttempt(
            timestamp=datetime.now(),
            ip=ip,
            port=port,
            success=success,
            user=user
        )
        self.connection_history.append(attempt)

        # Mettre a jour les infos IP
        info = self._get_ip_info(ip)
        info.last_seen = datetime.now()
        info.targeted_ports.add(port)

        if success:
            info.successful_attempts += 1
        else:
            info.failed_attempts += 1

    def calculate_threat_score(self, ip: str) -> int:
        """Calculer un score de menace pour une IP"""
        info = self._get_ip_info(ip)
        score = 0

        # Points pour echecs de connexion
        score += info.failed_attempts * 10

        # Points pour ports critiques cibles
        critical_targeted = info.targeted_ports.intersection(self.critical_ports)
        score += len(critical_targeted) * 20

        # Points pour scan de ports (nombreux ports differents)
        if len(info.targeted_ports) > 10:
            score += len(info.targeted_ports) * 5

        # Bonus si deja banni
        if info.is_banned or ip in self.banned_ips:
            score += 50

        info.threat_score = score
        return score

    def detect_brute_force(self) -> List[Alert]:
        """Detecter les attaques par force brute"""
        alerts = []
        self._cleanup_old_data()

        # Grouper les tentatives par IP
        ip_attempts: Dict[str, List[ConnectionAttempt]] = defaultdict(list)
        cutoff = datetime.now() - timedelta(seconds=self.failed_login_window)

        for attempt in self.connection_history:
            if attempt.timestamp > cutoff and not attempt.success:
                ip_attempts[attempt.ip].append(attempt)

        # Verifier les seuils
        for ip, attempts in ip_attempts.items():
            if len(attempts) >= self.failed_login_threshold:
                if self._can_alert(ip):
                    score = self.calculate_threat_score(ip)
                    info = self._get_ip_info(ip)

                    severity = Severity.CRITICAL if score > 100 else (
                        Severity.HIGH if score > 50 else Severity.MEDIUM
                    )

                    alerts.append(Alert(
                        title="Attaque Brute Force Detectee",
                        description=f"L'IP **{ip}** a effectue **{len(attempts)}** tentatives echouees",
                        severity=severity,
                        source="Intrusion Detector",
                        fields={
                            ":globe_with_meridians: IP": ip,
                            ":x: Tentatives": str(len(attempts)),
                            ":clock1: Fenetre": f"{self.failed_login_window}s",
                            ":chart_with_upwards_trend: Score Menace": str(score),
                            ":dart: Ports Cibles": ", ".join(map(str, sorted(info.targeted_ports)[:10]))
                        }
                    ))
                    self._mark_alerted(ip)

        return alerts

    def detect_port_scan(self) -> List[Alert]:
        """Detecter les scans de ports"""
        alerts = []
        cutoff = datetime.now() - timedelta(seconds=self.port_scan_window)

        # Grouper par IP et compter les ports uniques
        ip_ports: Dict[str, Set[int]] = defaultdict(set)

        for attempt in self.connection_history:
            if attempt.timestamp > cutoff:
                ip_ports[attempt.ip].add(attempt.port)

        for ip, ports in ip_ports.items():
            if len(ports) >= self.port_scan_threshold:
                if self._can_alert(ip):
                    score = self.calculate_threat_score(ip)

                    alerts.append(Alert(
                        title="Scan de Ports Detecte",
                        description=f"L'IP **{ip}** a cible **{len(ports)}** ports differents",
                        severity=Severity.HIGH,
                        source="Intrusion Detector",
                        fields={
                            ":globe_with_meridians: IP": ip,
                            ":electric_plug: Ports Scannes": str(len(ports)),
                            ":clock1: Fenetre": f"{self.port_scan_window}s",
                            ":chart_with_upwards_trend: Score Menace": str(score)
                        }
                    ))
                    self._mark_alerted(ip)

        return alerts

    def detect_suspicious_user(self, user: str, ip: str) -> Optional[Alert]:
        """Detecter les connexions avec des utilisateurs suspects"""
        suspicious_users = ["root", "admin", "administrator", "test", "guest", "oracle", "mysql"]

        if user.lower() in suspicious_users:
            if self._can_alert(f"{ip}:{user}"):
                self._mark_alerted(f"{ip}:{user}")
                return Alert(
                    title="Tentative Utilisateur Suspect",
                    description=f"Tentative de connexion avec l'utilisateur **{user}** depuis **{ip}**",
                    severity=Severity.MEDIUM,
                    source="Intrusion Detector",
                    fields={
                        ":bust_in_silhouette: Utilisateur": user,
                        ":globe_with_meridians: IP": ip
                    }
                )
        return None

    def analyze_auth_log_line(self, line: str) -> List[Alert]:
        """Analyser une ligne de log d'authentification"""
        alerts = []

        # Pattern pour SSH
        ssh_failed = re.search(
            r'Failed password for (?:invalid user )?(\w+) from ([\d.]+) port (\d+)',
            line
        )
        if ssh_failed:
            user, ip, port = ssh_failed.groups()
            self.record_connection(ip, int(port), success=False, user=user)

            # Verifier utilisateur suspect
            user_alert = self.detect_suspicious_user(user, ip)
            if user_alert:
                alerts.append(user_alert)

        # Connexion SSH reussie
        ssh_success = re.search(
            r'Accepted (?:password|publickey) for (\w+) from ([\d.]+) port (\d+)',
            line
        )
        if ssh_success:
            user, ip, port = ssh_success.groups()
            self.record_connection(ip, int(port), success=True, user=user)

        return alerts

    def get_threat_summary(self) -> Dict[str, Any]:
        """Obtenir un resume des menaces"""
        high_threat_ips = []
        for ip, info in self.ip_info.items():
            score = self.calculate_threat_score(ip)
            if score > 30:
                high_threat_ips.append({
                    "ip": ip,
                    "score": score,
                    "failed_attempts": info.failed_attempts,
                    "ports_targeted": len(info.targeted_ports)
                })

        high_threat_ips.sort(key=lambda x: x["score"], reverse=True)

        return {
            "total_tracked_ips": len(self.ip_info),
            "high_threat_ips": high_threat_ips[:10],
            "banned_ips": len(self.banned_ips),
            "total_failed_attempts": sum(i.failed_attempts for i in self.ip_info.values())
        }

    def run_check(self) -> List[Alert]:
        """Executer une verification d'intrusion"""
        if not self.enabled:
            return []

        alerts = []

        # Synchroniser les IPs bannies
        self._sync_banned_ips()

        # Detection brute force
        alerts.extend(self.detect_brute_force())

        # Detection port scan
        alerts.extend(self.detect_port_scan())

        return alerts
