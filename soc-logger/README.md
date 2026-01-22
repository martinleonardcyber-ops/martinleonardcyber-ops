# SOC Logger

Systeme de Logging et Monitoring de Securite avec alertes Discord.

Un outil complet pour surveiller votre VPS 24/7 et recevoir des alertes en temps reel sur Discord.

## Fonctionnalites

### Monitoring Systeme
- Surveillance CPU, RAM, Disque
- Alerte sur depassement de seuils configurables
- Suivi des connexions reseau
- Verification des services systemd

### Surveillance de Securite
- Analyse des logs systeme (auth.log, syslog, etc.)
- Detection des tentatives de connexion SSH
- Surveillance des connexions fail2ban
- Patterns de detection personnalisables

### Detection d'Intrusion
- Detection d'attaques brute force
- Detection de scans de ports
- Calcul de score de menace par IP
- Synchronisation avec fail2ban

### Alertes Discord
- Envoi en temps reel vers webhook Discord
- Embeds colores par severite
- Heartbeat periodique
- Rapport quotidien automatique

## Installation Rapide

```bash
# Cloner le repository
git clone https://github.com/martinleonardcyber-ops/soc-logger.git
cd soc-logger

# Installer
sudo ./install.sh

# Configurer le webhook Discord
sudo nano /etc/soc-logger/config.yaml

# Tester
python3 /opt/soc-logger/main.py --test

# Demarrer
sudo systemctl start soc-logger
sudo systemctl enable soc-logger
```

## Configuration

Editez `/etc/soc-logger/config.yaml`:

```yaml
# Webhook Discord (OBLIGATOIRE)
discord:
  webhook_url: "https://discord.com/api/webhooks/..."
  username: "SOC Logger"

# Seuils d'alerte
monitoring:
  check_interval: 30  # secondes
  thresholds:
    cpu_percent: 85
    memory_percent: 90
    disk_percent: 90

# Fichiers de logs a surveiller
security:
  log_files:
    - /var/log/auth.log
    - /var/log/syslog
```

## Obtenir un Webhook Discord

1. Ouvrir les parametres du serveur Discord
2. Aller dans "Integrations" > "Webhooks"
3. Cliquer "Nouveau webhook"
4. Copier l'URL du webhook
5. Coller dans `config.yaml`

## Commandes Utiles

```bash
# Status du service
sudo systemctl status soc-logger

# Voir les logs en temps reel
sudo journalctl -u soc-logger -f

# Redemarrer apres modification config
sudo systemctl restart soc-logger

# Tester la configuration
python3 /opt/soc-logger/main.py --test
```

## Structure des Alertes

| Severite | Couleur | Exemples |
|----------|---------|----------|
| CRITICAL | Rouge | RAM > 95%, Intrusion detectee |
| HIGH | Orange | Brute force, Service down |
| MEDIUM | Jaune | CPU > 85%, Firewall block |
| LOW | Bleu | Commande sudo |
| INFO | Vert | Connexion SSH reussie |

## Architecture

```
soc-logger/
├── main.py              # Script principal
├── config/
│   └── config.yaml      # Configuration
├── core/
│   ├── discord_webhook.py    # Module Discord
│   ├── system_monitor.py     # Monitoring systeme
│   ├── security_monitor.py   # Surveillance logs
│   └── intrusion_detector.py # Detection intrusion
├── install.sh           # Installation
├── uninstall.sh         # Desinstallation
└── soc-logger.service   # Service systemd
```

## Personnalisation

### Ajouter des patterns de detection

Dans `config.yaml`:

```yaml
security:
  alert_patterns:
    - pattern: "mon_pattern_regex"
      severity: "high"
      description: "Ma description"
```

### Surveiller des services

```yaml
health:
  check_services:
    - nginx
    - mysql
    - docker
```

## Troubleshooting

**Le service ne demarre pas:**
```bash
sudo journalctl -u soc-logger -n 50
```

**Pas d'alertes Discord:**
- Verifier l'URL du webhook
- Tester avec `python3 /opt/soc-logger/main.py --test`

**Permission denied sur les logs:**
- Le service doit tourner en root
- Verifier les permissions des fichiers de log

## Desinstallation

```bash
sudo ./uninstall.sh
```

## Licence

MIT License
