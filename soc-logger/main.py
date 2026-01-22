#!/usr/bin/env python3
"""
SOC Logger - Systeme de Logging et Monitoring de Securite
=========================================================

Script principal qui orchestre tous les modules de surveillance.
Concu pour tourner en continu sur un VPS avec envoi vers Discord.

Author: SOC Logger Team
Version: 1.0.0
"""

import os
import sys
import time
import signal
import socket
import logging
import argparse
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional
import threading
import queue

import yaml

# Ajouter le repertoire parent au path
sys.path.insert(0, str(Path(__file__).parent))

from core.discord_webhook import DiscordWebhook, Alert, Severity
from core.system_monitor import SystemMonitor
from core.security_monitor import SecurityMonitor
from core.intrusion_detector import IntrusionDetector

# Configuration du logging
LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
LOG_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


class SOCLogger:
    """Classe principale du systeme de logging SOC"""

    VERSION = "1.0.0"

    def __init__(self, config_path: str):
        self.config_path = config_path
        self.config = self._load_config()
        self.running = False
        self.hostname = socket.gethostname()

        # File d'attente pour les alertes
        self.alert_queue: queue.Queue = queue.Queue()
        self.batch_alerts: List[Alert] = []
        self.last_batch_time = datetime.now()

        # Initialiser le logging
        self._setup_logging()

        # Initialiser les modules
        self._init_modules()

        # Statistiques
        self.stats = {
            "start_time": None,
            "alerts_sent": 0,
            "alerts_by_severity": {s.value: 0 for s in Severity},
            "last_heartbeat": None,
            "checks_performed": 0
        }

        self.logger = logging.getLogger(__name__)

    def _load_config(self) -> Dict[str, Any]:
        """Charger la configuration depuis le fichier YAML"""
        config_file = Path(self.config_path)
        if not config_file.exists():
            print(f"Erreur: Fichier de configuration non trouve: {self.config_path}")
            sys.exit(1)

        with open(config_file, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)

    def _setup_logging(self):
        """Configurer le systeme de logging"""
        log_config = self.config.get("logging", {})
        log_level = getattr(logging, log_config.get("level", "INFO"))
        log_dir = log_config.get("log_dir", "/var/log/soc-logger")

        # Creer le repertoire de logs si necessaire
        Path(log_dir).mkdir(parents=True, exist_ok=True)

        # Handler console
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(logging.Formatter(LOG_FORMAT, LOG_DATE_FORMAT))

        # Handler fichier avec rotation
        from logging.handlers import RotatingFileHandler
        max_bytes = log_config.get("max_size_mb", 100) * 1024 * 1024
        backup_count = log_config.get("backup_count", 5)

        file_handler = RotatingFileHandler(
            f"{log_dir}/soc-logger.log",
            maxBytes=max_bytes,
            backupCount=backup_count
        )
        file_handler.setFormatter(logging.Formatter(LOG_FORMAT, LOG_DATE_FORMAT))

        # Configurer le logger root
        logging.basicConfig(
            level=log_level,
            handlers=[console_handler, file_handler]
        )

    def _init_modules(self):
        """Initialiser tous les modules"""
        discord_config = self.config.get("discord", {})
        self.webhook = DiscordWebhook(discord_config)

        # Configurer le cooldown
        notif_config = self.config.get("notifications", {})
        self.webhook.set_cooldown(notif_config.get("alert_cooldown", 300))

        # Module System Monitor
        monitoring_config = self.config.get("monitoring", {})
        health_config = self.config.get("health", {})
        monitoring_config["check_services"] = health_config.get("check_services", [])
        self.system_monitor = SystemMonitor(monitoring_config, self.webhook)

        # Module Security Monitor
        security_config = self.config.get("security", {})
        self.security_monitor = SecurityMonitor(security_config, self.webhook)

        # Module Intrusion Detector
        ids_config = self.config.get("intrusion_detection", {})
        self.intrusion_detector = IntrusionDetector(ids_config, self.webhook)

    def _signal_handler(self, signum, frame):
        """Gerer les signaux d'arret"""
        self.logger.info(f"Signal {signum} recu, arret en cours...")
        self.running = False

    def _process_alerts(self, alerts: List[Alert]):
        """Traiter les alertes generees"""
        notif_config = self.config.get("notifications", {})
        batch_alerts = notif_config.get("batch_alerts", True)
        batch_window = notif_config.get("batch_window", 60)

        for alert in alerts:
            if batch_alerts:
                self.batch_alerts.append(alert)
                self.stats["alerts_by_severity"][alert.severity.value] += 1
            else:
                if self.webhook.send_alert(alert):
                    self.stats["alerts_sent"] += 1
                    self.stats["alerts_by_severity"][alert.severity.value] += 1

        # Envoyer le batch si le temps est ecoule
        if batch_alerts and self.batch_alerts:
            if datetime.now() - self.last_batch_time > timedelta(seconds=batch_window):
                self._send_batch()

    def _send_batch(self):
        """Envoyer le batch d'alertes"""
        if self.batch_alerts:
            # Trier par severite (critiques en premier)
            severity_order = {
                Severity.CRITICAL: 0,
                Severity.HIGH: 1,
                Severity.MEDIUM: 2,
                Severity.LOW: 3,
                Severity.INFO: 4
            }
            self.batch_alerts.sort(key=lambda a: severity_order.get(a.severity, 5))

            # Envoyer par lots de 10 (limite Discord)
            for i in range(0, len(self.batch_alerts), 10):
                batch = self.batch_alerts[i:i+10]
                if self.webhook.send_batch_alerts(batch):
                    self.stats["alerts_sent"] += len(batch)
                time.sleep(1)  # Pause entre les batches

            self.batch_alerts.clear()
            self.last_batch_time = datetime.now()

    def _send_heartbeat(self):
        """Envoyer un heartbeat"""
        health_config = self.config.get("health", {})
        if not health_config.get("enabled", True):
            return

        stats = self.system_monitor.get_stats()
        self.webhook.send_heartbeat(
            hostname=self.hostname,
            uptime=stats.uptime,
            stats={
                "cpu": stats.cpu_percent,
                "memory": stats.memory_percent,
                "disk": stats.disk_percent,
                "connections": stats.network_connections
            }
        )
        self.stats["last_heartbeat"] = datetime.now()
        self.logger.info("Heartbeat envoye")

    def _send_daily_report(self):
        """Envoyer le rapport quotidien"""
        notif_config = self.config.get("notifications", {})
        if not notif_config.get("daily_report", True):
            return

        security_stats = self.security_monitor.get_statistics()
        threat_summary = self.intrusion_detector.get_threat_summary()

        report_data = {
            "period": "24 heures",
            "critical_count": self.stats["alerts_by_severity"]["critical"],
            "high_count": self.stats["alerts_by_severity"]["high"],
            "medium_count": self.stats["alerts_by_severity"]["medium"],
            "ssh_connections": security_stats.get("total_events", 0),
            "blocked_attempts": threat_summary.get("total_failed_attempts", 0),
            "banned_ips": threat_summary.get("banned_ips", 0)
        }

        self.webhook.send_daily_report(self.hostname, report_data)
        self.logger.info("Rapport quotidien envoye")

        # Reset des stats quotidiennes
        for severity in self.stats["alerts_by_severity"]:
            self.stats["alerts_by_severity"][severity] = 0

    def _check_daily_report_time(self) -> bool:
        """Verifier si c'est l'heure du rapport quotidien"""
        notif_config = self.config.get("notifications", {})
        report_time = notif_config.get("daily_report_time", "08:00")

        try:
            hour, minute = map(int, report_time.split(":"))
            now = datetime.now()
            return now.hour == hour and now.minute == minute
        except ValueError:
            return False

    def run_monitoring_cycle(self):
        """Executer un cycle de monitoring"""
        all_alerts = []
        self.stats["checks_performed"] += 1

        # Verification systeme
        try:
            system_alerts, stats = self.system_monitor.run_check()
            all_alerts.extend(system_alerts)
        except Exception as e:
            self.logger.error(f"Erreur monitoring systeme: {e}")

        # Verification securite
        try:
            security_alerts = self.security_monitor.run_check()
            all_alerts.extend(security_alerts)

            # Alimenter l'IDS avec les evenements de securite
            for alert in security_alerts:
                if "ip" in alert.fields:
                    ip = alert.fields[":globe_with_meridians: IP"]
                    port = int(alert.fields.get(":electric_plug: Port", 22))
                    is_success = alert.severity == Severity.INFO
                    self.intrusion_detector.record_connection(ip, port, is_success)
        except Exception as e:
            self.logger.error(f"Erreur monitoring securite: {e}")

        # Verification intrusion
        try:
            ids_alerts = self.intrusion_detector.run_check()
            all_alerts.extend(ids_alerts)
        except Exception as e:
            self.logger.error(f"Erreur detection intrusion: {e}")

        # Traiter les alertes
        if all_alerts:
            self._process_alerts(all_alerts)

        return len(all_alerts)

    def run(self):
        """Boucle principale"""
        # Configurer les signaux
        signal.signal(signal.SIGTERM, self._signal_handler)
        signal.signal(signal.SIGINT, self._signal_handler)

        self.running = True
        self.stats["start_time"] = datetime.now()

        self.logger.info(f"SOC Logger v{self.VERSION} demarre sur {self.hostname}")

        # Message de demarrage
        self.webhook.send_startup_message(self.hostname, self.VERSION)

        monitoring_config = self.config.get("monitoring", {})
        check_interval = monitoring_config.get("check_interval", 30)

        health_config = self.config.get("health", {})
        heartbeat_interval = health_config.get("heartbeat_interval", 60)
        last_heartbeat = datetime.now()

        daily_report_sent = False

        try:
            while self.running:
                cycle_start = time.time()

                # Executer le cycle de monitoring
                alert_count = self.run_monitoring_cycle()
                if alert_count > 0:
                    self.logger.info(f"{alert_count} alertes detectees")

                # Heartbeat
                if datetime.now() - last_heartbeat > timedelta(minutes=heartbeat_interval):
                    self._send_heartbeat()
                    last_heartbeat = datetime.now()

                # Rapport quotidien
                if self._check_daily_report_time():
                    if not daily_report_sent:
                        self._send_daily_report()
                        daily_report_sent = True
                else:
                    daily_report_sent = False

                # Forcer l'envoi des alertes en attente
                if self.batch_alerts:
                    time_since_batch = (datetime.now() - self.last_batch_time).total_seconds()
                    if time_since_batch > 30:  # 30 secondes minimum
                        self._send_batch()

                # Attendre avant le prochain cycle
                cycle_duration = time.time() - cycle_start
                sleep_time = max(0, check_interval - cycle_duration)
                if sleep_time > 0:
                    time.sleep(sleep_time)

        except Exception as e:
            self.logger.error(f"Erreur fatale: {e}", exc_info=True)
        finally:
            # Envoyer les alertes restantes
            if self.batch_alerts:
                self._send_batch()

            # Message d'arret
            self.webhook.send_shutdown_message(self.hostname)
            self.logger.info("SOC Logger arrete")

    def get_status(self) -> Dict[str, Any]:
        """Obtenir le statut actuel"""
        uptime = None
        if self.stats["start_time"]:
            uptime = str(datetime.now() - self.stats["start_time"])

        return {
            "running": self.running,
            "hostname": self.hostname,
            "version": self.VERSION,
            "uptime": uptime,
            "stats": self.stats,
            "system_info": self.system_monitor.get_system_info(),
            "threat_summary": self.intrusion_detector.get_threat_summary()
        }


def main():
    parser = argparse.ArgumentParser(
        description="SOC Logger - Systeme de Logging et Monitoring de Securite"
    )
    parser.add_argument(
        "-c", "--config",
        default="/etc/soc-logger/config.yaml",
        help="Chemin vers le fichier de configuration"
    )
    parser.add_argument(
        "-v", "--version",
        action="version",
        version=f"SOC Logger v{SOCLogger.VERSION}"
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="Tester la configuration et envoyer un message test"
    )

    args = parser.parse_args()

    # Chercher le fichier de configuration
    config_paths = [
        args.config,
        "./config/config.yaml",
        "../config/config.yaml",
        str(Path(__file__).parent / "config" / "config.yaml")
    ]

    config_path = None
    for path in config_paths:
        if Path(path).exists():
            config_path = path
            break

    if not config_path:
        print("Erreur: Aucun fichier de configuration trouve")
        print("Chemins verifies:", config_paths)
        sys.exit(1)

    print(f"Utilisation de la configuration: {config_path}")

    try:
        soc = SOCLogger(config_path)

        if args.test:
            print("Test de la configuration...")
            soc.webhook.send_startup_message(soc.hostname, soc.VERSION)
            print("Message de test envoye!")
            sys.exit(0)

        soc.run()

    except KeyboardInterrupt:
        print("\nArret demande par l'utilisateur")
    except Exception as e:
        print(f"Erreur: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
