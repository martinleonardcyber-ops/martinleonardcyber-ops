#!/usr/bin/env python3
"""
Security Monitor Module
Surveille les logs systeme pour detecter les evenements de securite
"""

import os
import re
import time
from datetime import datetime
from typing import Dict, List, Any, Optional, Set
from dataclasses import dataclass, field
from collections import defaultdict
import logging

from .discord_webhook import DiscordWebhook, Alert, Severity

logger = logging.getLogger(__name__)


@dataclass
class LogPattern:
    """Pattern de detection dans les logs"""
    pattern: str
    severity: str
    description: str
    compiled: re.Pattern = field(init=False)

    def __post_init__(self):
        self.compiled = re.compile(self.pattern, re.IGNORECASE)


@dataclass
class LogEvent:
    """Evenement detecte dans les logs"""
    timestamp: datetime
    log_file: str
    line: str
    pattern: LogPattern
    extracted_data: Dict[str, str] = field(default_factory=dict)


class LogWatcher:
    """Surveillant de fichier de log individuel"""

    def __init__(self, filepath: str):
        self.filepath = filepath
        self.position = 0
        self.inode = None
        self._init_file()

    def _init_file(self):
        """Initialiser la position de lecture"""
        try:
            if os.path.exists(self.filepath):
                stat = os.stat(self.filepath)
                self.inode = stat.st_ino
                # Commencer a la fin du fichier
                self.position = stat.st_size
                logger.debug(f"Initialise {self.filepath} a la position {self.position}")
        except OSError as e:
            logger.warning(f"Impossible d'initialiser {self.filepath}: {e}")

    def _check_rotation(self) -> bool:
        """Verifier si le fichier a ete rotate"""
        try:
            if os.path.exists(self.filepath):
                stat = os.stat(self.filepath)
                if stat.st_ino != self.inode:
                    logger.info(f"Rotation detectee pour {self.filepath}")
                    self.inode = stat.st_ino
                    self.position = 0
                    return True
                # Si le fichier a retreci, il a probablement ete tronque
                if stat.st_size < self.position:
                    logger.info(f"Fichier tronque: {self.filepath}")
                    self.position = 0
                    return True
        except OSError:
            pass
        return False

    def read_new_lines(self) -> List[str]:
        """Lire les nouvelles lignes du fichier"""
        lines = []
        try:
            self._check_rotation()
            if not os.path.exists(self.filepath):
                return lines

            with open(self.filepath, 'r', encoding='utf-8', errors='ignore') as f:
                f.seek(self.position)
                new_content = f.read()
                if new_content:
                    lines = new_content.splitlines()
                    self.position = f.tell()

        except PermissionError:
            logger.warning(f"Permission refusee: {self.filepath}")
        except OSError as e:
            logger.warning(f"Erreur lecture {self.filepath}: {e}")

        return lines


class SecurityMonitor:
    """Moniteur de securite principal"""

    # Patterns communs pour extraire des informations
    IP_PATTERN = re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b')
    USER_PATTERN = re.compile(r'user[=:\s]+(\w+)', re.IGNORECASE)
    PORT_PATTERN = re.compile(r'port[=:\s]+(\d+)', re.IGNORECASE)

    def __init__(self, config: Dict[str, Any], webhook: DiscordWebhook):
        self.config = config
        self.webhook = webhook
        self.watchers: Dict[str, LogWatcher] = {}
        self.patterns: List[LogPattern] = []
        self.event_counts: Dict[str, int] = defaultdict(int)
        self.last_events: Dict[str, datetime] = {}

        self._init_watchers()
        self._init_patterns()

    def _init_watchers(self):
        """Initialiser les watchers pour chaque fichier de log"""
        log_files = self.config.get("log_files", [])
        for filepath in log_files:
            if os.path.exists(filepath):
                self.watchers[filepath] = LogWatcher(filepath)
                logger.info(f"Surveillance de {filepath}")
            else:
                logger.debug(f"Fichier non trouve: {filepath}")

    def _init_patterns(self):
        """Initialiser les patterns de detection"""
        alert_patterns = self.config.get("alert_patterns", [])
        for p in alert_patterns:
            try:
                pattern = LogPattern(
                    pattern=p["pattern"],
                    severity=p.get("severity", "medium"),
                    description=p.get("description", "Evenement detecte")
                )
                self.patterns.append(pattern)
            except re.error as e:
                logger.error(f"Pattern regex invalide '{p['pattern']}': {e}")

    def _extract_ip(self, line: str) -> Optional[str]:
        """Extraire une adresse IP d'une ligne"""
        match = self.IP_PATTERN.search(line)
        return match.group(0) if match else None

    def _extract_user(self, line: str) -> Optional[str]:
        """Extraire un nom d'utilisateur"""
        match = self.USER_PATTERN.search(line)
        return match.group(1) if match else None

    def _extract_data(self, line: str) -> Dict[str, str]:
        """Extraire les donnees pertinentes d'une ligne de log"""
        data = {}

        ip = self._extract_ip(line)
        if ip:
            data["ip"] = ip

        user = self._extract_user(line)
        if user:
            data["user"] = user

        port_match = self.PORT_PATTERN.search(line)
        if port_match:
            data["port"] = port_match.group(1)

        return data

    def _severity_to_enum(self, severity_str: str) -> Severity:
        """Convertir string en enum Severity"""
        mapping = {
            "critical": Severity.CRITICAL,
            "high": Severity.HIGH,
            "medium": Severity.MEDIUM,
            "low": Severity.LOW,
            "info": Severity.INFO
        }
        return mapping.get(severity_str.lower(), Severity.MEDIUM)

    def analyze_line(self, line: str, log_file: str) -> Optional[LogEvent]:
        """Analyser une ligne de log"""
        for pattern in self.patterns:
            if pattern.compiled.search(line):
                event = LogEvent(
                    timestamp=datetime.now(),
                    log_file=log_file,
                    line=line[:500],  # Limiter la taille
                    pattern=pattern,
                    extracted_data=self._extract_data(line)
                )
                return event
        return None

    def create_alert_from_event(self, event: LogEvent) -> Alert:
        """Creer une alerte a partir d'un evenement"""
        fields = {
            ":page_facing_up: Fichier Log": os.path.basename(event.log_file),
        }

        if "ip" in event.extracted_data:
            fields[":globe_with_meridians: IP"] = event.extracted_data["ip"]
        if "user" in event.extracted_data:
            fields[":bust_in_silhouette: Utilisateur"] = event.extracted_data["user"]
        if "port" in event.extracted_data:
            fields[":electric_plug: Port"] = event.extracted_data["port"]

        # Tronquer la ligne si trop longue
        log_line = event.line
        if len(log_line) > 200:
            log_line = log_line[:200] + "..."

        fields[":memo: Log"] = f"```{log_line}```"

        return Alert(
            title=event.pattern.description,
            description=f"Evenement de securite detecte dans **{os.path.basename(event.log_file)}**",
            severity=self._severity_to_enum(event.pattern.severity),
            source="Security Monitor",
            fields=fields,
            timestamp=event.timestamp
        )

    def scan_logs(self) -> List[Alert]:
        """Scanner tous les fichiers de log pour de nouveaux evenements"""
        alerts = []

        for filepath, watcher in self.watchers.items():
            new_lines = watcher.read_new_lines()
            for line in new_lines:
                if not line.strip():
                    continue

                event = self.analyze_line(line, filepath)
                if event:
                    # Comptage des evenements
                    event_key = f"{event.pattern.description}:{event.extracted_data.get('ip', 'unknown')}"
                    self.event_counts[event_key] += 1
                    self.last_events[event_key] = datetime.now()

                    # Creer l'alerte
                    alert = self.create_alert_from_event(event)
                    alerts.append(alert)
                    logger.debug(f"Evenement detecte: {event.pattern.description}")

        return alerts

    def get_statistics(self) -> Dict[str, Any]:
        """Obtenir les statistiques des evenements"""
        return {
            "total_events": sum(self.event_counts.values()),
            "unique_events": len(self.event_counts),
            "event_breakdown": dict(self.event_counts),
            "watched_files": list(self.watchers.keys())
        }

    def get_top_offenders(self, n: int = 10) -> List[Dict[str, Any]]:
        """Obtenir les IPs avec le plus d'evenements"""
        ip_counts: Dict[str, int] = defaultdict(int)

        for event_key, count in self.event_counts.items():
            parts = event_key.split(":")
            if len(parts) >= 2:
                ip = parts[-1]
                if ip != "unknown":
                    ip_counts[ip] += count

        sorted_ips = sorted(ip_counts.items(), key=lambda x: x[1], reverse=True)
        return [{"ip": ip, "count": count} for ip, count in sorted_ips[:n]]

    def reset_statistics(self):
        """Reinitialiser les statistiques"""
        self.event_counts.clear()
        self.last_events.clear()

    def run_check(self) -> List[Alert]:
        """Executer une verification des logs"""
        logger.debug("Scan des fichiers de log")
        return self.scan_logs()
