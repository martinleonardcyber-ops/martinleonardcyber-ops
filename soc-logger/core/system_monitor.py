#!/usr/bin/env python3
"""
System Monitor Module
Surveille les ressources systeme (CPU, RAM, Disque, Reseau)
"""

import psutil
import socket
import platform
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import logging

from .discord_webhook import DiscordWebhook, Alert, Severity

logger = logging.getLogger(__name__)


@dataclass
class SystemStats:
    """Statistiques systeme"""
    cpu_percent: float
    memory_percent: float
    memory_used_gb: float
    memory_total_gb: float
    disk_percent: float
    disk_used_gb: float
    disk_total_gb: float
    network_connections: int
    network_bytes_sent: int
    network_bytes_recv: int
    load_average: tuple
    boot_time: datetime
    uptime: str


class SystemMonitor:
    """Moniteur des ressources systeme"""

    def __init__(self, config: Dict[str, Any], webhook: DiscordWebhook):
        self.config = config
        self.webhook = webhook
        self.thresholds = config.get("thresholds", {})
        self.hostname = socket.gethostname()
        self.last_net_io = psutil.net_io_counters()
        self.last_check_time = datetime.now()

        # Seuils par defaut
        self.cpu_threshold = self.thresholds.get("cpu_percent", 85)
        self.memory_threshold = self.thresholds.get("memory_percent", 90)
        self.disk_threshold = self.thresholds.get("disk_percent", 90)
        self.connections_threshold = self.thresholds.get("network_connections", 500)

        # Etat des alertes (pour eviter les doublons)
        self.alert_states: Dict[str, bool] = {
            "cpu": False,
            "memory": False,
            "disk": False,
            "connections": False
        }

    def get_uptime(self) -> str:
        """Calculer le uptime du systeme"""
        boot_time = datetime.fromtimestamp(psutil.boot_time())
        uptime = datetime.now() - boot_time
        days = uptime.days
        hours, remainder = divmod(uptime.seconds, 3600)
        minutes, _ = divmod(remainder, 60)
        return f"{days}j {hours}h {minutes}m"

    def get_system_info(self) -> Dict[str, str]:
        """Obtenir les informations systeme"""
        return {
            "hostname": self.hostname,
            "platform": platform.system(),
            "platform_version": platform.version(),
            "architecture": platform.machine(),
            "processor": platform.processor(),
            "python_version": platform.python_version(),
            "ip_address": self._get_ip_address()
        }

    def _get_ip_address(self) -> str:
        """Obtenir l'adresse IP principale"""
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            return "N/A"

    def get_stats(self) -> SystemStats:
        """Collecter toutes les statistiques systeme"""
        # CPU
        cpu_percent = psutil.cpu_percent(interval=1)

        # Memoire
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        memory_used_gb = memory.used / (1024 ** 3)
        memory_total_gb = memory.total / (1024 ** 3)

        # Disque (partition racine)
        disk = psutil.disk_usage('/')
        disk_percent = disk.percent
        disk_used_gb = disk.used / (1024 ** 3)
        disk_total_gb = disk.total / (1024 ** 3)

        # Reseau
        net_connections = len(psutil.net_connections())
        net_io = psutil.net_io_counters()

        # Load average (Linux/Mac)
        try:
            load_avg = os.getloadavg()
        except (AttributeError, OSError):
            load_avg = (0, 0, 0)

        # Uptime
        boot_time = datetime.fromtimestamp(psutil.boot_time())
        uptime = self.get_uptime()

        return SystemStats(
            cpu_percent=cpu_percent,
            memory_percent=memory_percent,
            memory_used_gb=memory_used_gb,
            memory_total_gb=memory_total_gb,
            disk_percent=disk_percent,
            disk_used_gb=disk_used_gb,
            disk_total_gb=disk_total_gb,
            network_connections=net_connections,
            network_bytes_sent=net_io.bytes_sent,
            network_bytes_recv=net_io.bytes_recv,
            load_average=load_avg,
            boot_time=boot_time,
            uptime=uptime
        )

    def check_thresholds(self, stats: SystemStats) -> List[Alert]:
        """Verifier les seuils et generer des alertes"""
        alerts = []

        # CPU
        if stats.cpu_percent >= self.cpu_threshold:
            if not self.alert_states["cpu"]:
                alerts.append(Alert(
                    title="Utilisation CPU Elevee",
                    description=f"L'utilisation CPU a atteint **{stats.cpu_percent:.1f}%**",
                    severity=Severity.HIGH if stats.cpu_percent >= 95 else Severity.MEDIUM,
                    source="System Monitor",
                    fields={
                        ":computer: Hostname": self.hostname,
                        ":chart_with_upwards_trend: Seuil": f"{self.cpu_threshold}%",
                        ":bar_chart: Load Average": f"{stats.load_average[0]:.2f}, {stats.load_average[1]:.2f}, {stats.load_average[2]:.2f}"
                    }
                ))
                self.alert_states["cpu"] = True
        else:
            if self.alert_states["cpu"]:
                # CPU revenu a la normale
                alerts.append(Alert(
                    title="CPU Revenu a la Normale",
                    description=f"L'utilisation CPU est redescendue a **{stats.cpu_percent:.1f}%**",
                    severity=Severity.INFO,
                    source="System Monitor",
                    fields={":computer: Hostname": self.hostname}
                ))
                self.alert_states["cpu"] = False

        # Memoire
        if stats.memory_percent >= self.memory_threshold:
            if not self.alert_states["memory"]:
                alerts.append(Alert(
                    title="Memoire RAM Critique",
                    description=f"L'utilisation memoire a atteint **{stats.memory_percent:.1f}%**",
                    severity=Severity.CRITICAL if stats.memory_percent >= 95 else Severity.HIGH,
                    source="System Monitor",
                    fields={
                        ":computer: Hostname": self.hostname,
                        ":floppy_disk: Utilise": f"{stats.memory_used_gb:.1f} GB",
                        ":cd: Total": f"{stats.memory_total_gb:.1f} GB"
                    }
                ))
                self.alert_states["memory"] = True
        else:
            if self.alert_states["memory"]:
                alerts.append(Alert(
                    title="Memoire Revenue a la Normale",
                    description=f"L'utilisation memoire est redescendue a **{stats.memory_percent:.1f}%**",
                    severity=Severity.INFO,
                    source="System Monitor",
                    fields={":computer: Hostname": self.hostname}
                ))
                self.alert_states["memory"] = False

        # Disque
        if stats.disk_percent >= self.disk_threshold:
            if not self.alert_states["disk"]:
                alerts.append(Alert(
                    title="Espace Disque Critique",
                    description=f"L'utilisation disque a atteint **{stats.disk_percent:.1f}%**",
                    severity=Severity.CRITICAL if stats.disk_percent >= 95 else Severity.HIGH,
                    source="System Monitor",
                    fields={
                        ":computer: Hostname": self.hostname,
                        ":file_folder: Utilise": f"{stats.disk_used_gb:.1f} GB",
                        ":dvd: Total": f"{stats.disk_total_gb:.1f} GB",
                        ":free: Libre": f"{stats.disk_total_gb - stats.disk_used_gb:.1f} GB"
                    }
                ))
                self.alert_states["disk"] = True
        else:
            if self.alert_states["disk"]:
                alerts.append(Alert(
                    title="Espace Disque OK",
                    description=f"L'utilisation disque est redescendue a **{stats.disk_percent:.1f}%**",
                    severity=Severity.INFO,
                    source="System Monitor",
                    fields={":computer: Hostname": self.hostname}
                ))
                self.alert_states["disk"] = False

        # Connexions reseau
        if stats.network_connections >= self.connections_threshold:
            if not self.alert_states["connections"]:
                alerts.append(Alert(
                    title="Nombre de Connexions Eleve",
                    description=f"**{stats.network_connections}** connexions reseau actives",
                    severity=Severity.MEDIUM,
                    source="System Monitor",
                    fields={
                        ":computer: Hostname": self.hostname,
                        ":chart_with_upwards_trend: Seuil": str(self.connections_threshold)
                    }
                ))
                self.alert_states["connections"] = True
        else:
            if self.alert_states["connections"]:
                self.alert_states["connections"] = False

        return alerts

    def get_top_processes(self, n: int = 5) -> List[Dict[str, Any]]:
        """Obtenir les N processus les plus gourmands en CPU"""
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
            try:
                pinfo = proc.info
                processes.append({
                    'pid': pinfo['pid'],
                    'name': pinfo['name'],
                    'cpu': pinfo['cpu_percent'] or 0,
                    'memory': pinfo['memory_percent'] or 0
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass

        # Trier par CPU
        processes.sort(key=lambda x: x['cpu'], reverse=True)
        return processes[:n]

    def get_listening_ports(self) -> List[Dict[str, Any]]:
        """Obtenir la liste des ports en ecoute"""
        listening = []
        for conn in psutil.net_connections(kind='inet'):
            if conn.status == 'LISTEN':
                listening.append({
                    'port': conn.laddr.port,
                    'address': conn.laddr.ip,
                    'pid': conn.pid
                })
        return sorted(listening, key=lambda x: x['port'])

    def check_service_status(self, service_name: str) -> bool:
        """Verifier si un service systemd est actif"""
        try:
            import subprocess
            result = subprocess.run(
                ['systemctl', 'is-active', service_name],
                capture_output=True,
                text=True,
                timeout=5
            )
            return result.stdout.strip() == 'active'
        except Exception:
            return False

    def monitor_services(self, services: List[str]) -> List[Alert]:
        """Surveiller une liste de services"""
        alerts = []
        for service in services:
            if not self.check_service_status(service):
                alerts.append(Alert(
                    title=f"Service {service} Inactif",
                    description=f"Le service **{service}** n'est pas en cours d'execution",
                    severity=Severity.HIGH,
                    source="Service Monitor",
                    fields={
                        ":computer: Hostname": self.hostname,
                        ":gear: Service": service
                    }
                ))
        return alerts

    def run_check(self) -> List[Alert]:
        """Executer une verification complete"""
        logger.debug("Execution de la verification systeme")
        stats = self.get_stats()
        alerts = self.check_thresholds(stats)

        # Verifier les services si configure
        services = self.config.get("check_services", [])
        if services:
            alerts.extend(self.monitor_services(services))

        return alerts, stats
