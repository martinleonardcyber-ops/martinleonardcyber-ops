#!/usr/bin/env python3
"""
Discord Webhook Module
Gere l'envoi des alertes et notifications vers Discord
"""

import requests
import json
import time
from datetime import datetime
from typing import Optional, Dict, List, Any
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class Severity(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


@dataclass
class Alert:
    title: str
    description: str
    severity: Severity
    source: str
    timestamp: datetime = None
    fields: Dict[str, str] = None
    footer: str = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()
        if self.fields is None:
            self.fields = {}


class DiscordWebhook:
    """Gestionnaire de webhook Discord pour les alertes SOC"""

    SEVERITY_EMOJIS = {
        Severity.CRITICAL: ":rotating_light:",
        Severity.HIGH: ":warning:",
        Severity.MEDIUM: ":orange_circle:",
        Severity.LOW: ":blue_circle:",
        Severity.INFO: ":white_check_mark:",
    }

    SEVERITY_COLORS = {
        Severity.CRITICAL: 15158332,  # Rouge
        Severity.HIGH: 15105570,      # Orange
        Severity.MEDIUM: 16776960,    # Jaune
        Severity.LOW: 3447003,        # Bleu
        Severity.INFO: 3066993,       # Vert
    }

    def __init__(self, config: Dict[str, Any]):
        self.webhook_url = config.get("webhook_url", "")
        self.username = config.get("username", "SOC Logger")
        self.avatar_url = config.get("avatar_url", "")
        self.rate_limit_remaining = 5
        self.rate_limit_reset = 0
        self.alert_cooldowns: Dict[str, float] = {}
        self.cooldown_seconds = 300

        # Charger les couleurs personnalisees si presentes
        custom_colors = config.get("colors", {})
        for severity in Severity:
            if severity.value in custom_colors:
                self.SEVERITY_COLORS[severity] = custom_colors[severity.value]

    def set_cooldown(self, seconds: int):
        """Definir le cooldown entre alertes similaires"""
        self.cooldown_seconds = seconds

    def _get_cooldown_key(self, alert: Alert) -> str:
        """Generer une cle unique pour le cooldown"""
        return f"{alert.source}:{alert.title}:{alert.severity.value}"

    def _is_in_cooldown(self, alert: Alert) -> bool:
        """Verifier si une alerte similaire est en cooldown"""
        key = self._get_cooldown_key(alert)
        if key in self.alert_cooldowns:
            if time.time() < self.alert_cooldowns[key]:
                return True
        return False

    def _set_cooldown(self, alert: Alert):
        """Mettre une alerte en cooldown"""
        key = self._get_cooldown_key(alert)
        self.alert_cooldowns[key] = time.time() + self.cooldown_seconds

    def _handle_rate_limit(self, response: requests.Response):
        """Gerer le rate limiting de Discord"""
        self.rate_limit_remaining = int(
            response.headers.get("X-RateLimit-Remaining", 5)
        )
        self.rate_limit_reset = float(
            response.headers.get("X-RateLimit-Reset", 0)
        )

        if response.status_code == 429:
            retry_after = response.json().get("retry_after", 5)
            logger.warning(f"Rate limited, attente de {retry_after}s")
            time.sleep(retry_after)
            return True
        return False

    def _build_embed(self, alert: Alert) -> Dict[str, Any]:
        """Construire l'embed Discord pour une alerte"""
        emoji = self.SEVERITY_EMOJIS.get(alert.severity, "")
        color = self.SEVERITY_COLORS.get(alert.severity, 0)

        embed = {
            "title": f"{emoji} {alert.title}",
            "description": alert.description,
            "color": color,
            "timestamp": alert.timestamp.isoformat(),
            "fields": [
                {
                    "name": ":shield: Source",
                    "value": alert.source,
                    "inline": True
                },
                {
                    "name": ":exclamation: Severite",
                    "value": alert.severity.value.upper(),
                    "inline": True
                }
            ]
        }

        # Ajouter les champs personnalises
        for name, value in alert.fields.items():
            embed["fields"].append({
                "name": name,
                "value": str(value)[:1024],  # Limite Discord
                "inline": len(str(value)) < 50
            })

        if alert.footer:
            embed["footer"] = {"text": alert.footer}
        else:
            embed["footer"] = {
                "text": f"SOC Logger v1.0 | {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
            }

        return embed

    def send_alert(self, alert: Alert, bypass_cooldown: bool = False) -> bool:
        """Envoyer une alerte vers Discord"""
        if not self.webhook_url or self.webhook_url == "YOUR_DISCORD_WEBHOOK_URL_HERE":
            logger.error("Webhook URL non configuree!")
            return False

        # Verifier le cooldown
        if not bypass_cooldown and self._is_in_cooldown(alert):
            logger.debug(f"Alerte en cooldown: {alert.title}")
            return False

        # Respecter le rate limit
        if self.rate_limit_remaining <= 1:
            wait_time = max(0, self.rate_limit_reset - time.time())
            if wait_time > 0:
                time.sleep(wait_time)

        payload = {
            "username": self.username,
            "avatar_url": self.avatar_url,
            "embeds": [self._build_embed(alert)]
        }

        try:
            response = requests.post(
                self.webhook_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )

            if self._handle_rate_limit(response):
                # Retry apres rate limit
                response = requests.post(
                    self.webhook_url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                    timeout=10
                )

            if response.status_code in [200, 204]:
                self._set_cooldown(alert)
                logger.info(f"Alerte envoyee: {alert.title}")
                return True
            else:
                logger.error(
                    f"Erreur envoi Discord: {response.status_code} - {response.text}"
                )
                return False

        except requests.exceptions.Timeout:
            logger.error("Timeout lors de l'envoi vers Discord")
            return False
        except requests.exceptions.RequestException as e:
            logger.error(f"Erreur reseau Discord: {e}")
            return False

    def send_batch_alerts(self, alerts: List[Alert]) -> bool:
        """Envoyer plusieurs alertes en une seule requete"""
        if not alerts:
            return True

        if not self.webhook_url or self.webhook_url == "YOUR_DISCORD_WEBHOOK_URL_HERE":
            logger.error("Webhook URL non configuree!")
            return False

        # Discord limite a 10 embeds par message
        embeds = [self._build_embed(alert) for alert in alerts[:10]]

        payload = {
            "username": self.username,
            "avatar_url": self.avatar_url,
            "embeds": embeds
        }

        try:
            response = requests.post(
                self.webhook_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )

            if response.status_code in [200, 204]:
                for alert in alerts[:10]:
                    self._set_cooldown(alert)
                logger.info(f"Batch de {len(embeds)} alertes envoyees")
                return True
            else:
                logger.error(f"Erreur batch Discord: {response.status_code}")
                return False

        except requests.exceptions.RequestException as e:
            logger.error(f"Erreur reseau Discord: {e}")
            return False

    def send_heartbeat(self, hostname: str, uptime: str, stats: Dict[str, Any]) -> bool:
        """Envoyer un heartbeat/status vers Discord"""
        alert = Alert(
            title=":heartbeat: Heartbeat",
            description=f"Le systeme **{hostname}** est operationnel",
            severity=Severity.INFO,
            source="Health Monitor",
            fields={
                ":clock1: Uptime": uptime,
                ":computer: CPU": f"{stats.get('cpu', 0)}%",
                ":floppy_disk: RAM": f"{stats.get('memory', 0)}%",
                ":file_folder: Disque": f"{stats.get('disk', 0)}%",
                ":globe_with_meridians: Connexions": str(stats.get('connections', 0))
            }
        )
        return self.send_alert(alert, bypass_cooldown=True)

    def send_daily_report(self, hostname: str, report_data: Dict[str, Any]) -> bool:
        """Envoyer le rapport quotidien"""
        description = f"""
**Rapport de securite pour {hostname}**
Periode: {report_data.get('period', 'N/A')}
        """

        alert = Alert(
            title=":bar_chart: Rapport Quotidien SOC",
            description=description,
            severity=Severity.INFO,
            source="Daily Report",
            fields={
                ":rotating_light: Alertes Critiques": str(report_data.get('critical_count', 0)),
                ":warning: Alertes Hautes": str(report_data.get('high_count', 0)),
                ":orange_circle: Alertes Moyennes": str(report_data.get('medium_count', 0)),
                ":bust_in_silhouette: Connexions SSH": str(report_data.get('ssh_connections', 0)),
                ":no_entry: Tentatives Bloquees": str(report_data.get('blocked_attempts', 0)),
                ":shield: IPs Bannies": str(report_data.get('banned_ips', 0))
            },
            footer=f"Genere le {datetime.now().strftime('%Y-%m-%d a %H:%M')}"
        )
        return self.send_alert(alert, bypass_cooldown=True)

    def send_startup_message(self, hostname: str, version: str) -> bool:
        """Envoyer un message de demarrage"""
        alert = Alert(
            title=":rocket: SOC Logger Demarre",
            description=f"Le systeme de surveillance a demarre sur **{hostname}**",
            severity=Severity.INFO,
            source="System",
            fields={
                ":label: Version": version,
                ":clock1: Demarrage": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                ":gear: Status": "Operationnel"
            }
        )
        return self.send_alert(alert, bypass_cooldown=True)

    def send_shutdown_message(self, hostname: str, reason: str = "Arret normal") -> bool:
        """Envoyer un message d'arret"""
        alert = Alert(
            title=":octagonal_sign: SOC Logger Arrete",
            description=f"Le systeme de surveillance s'arrete sur **{hostname}**",
            severity=Severity.MEDIUM,
            source="System",
            fields={
                ":page_facing_up: Raison": reason,
                ":clock1: Heure": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
        )
        return self.send_alert(alert, bypass_cooldown=True)
