#!/bin/bash
#
# SOC Logger - Script d'installation
# ==================================
#
# Usage: sudo ./install.sh
#

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
INSTALL_DIR="/opt/soc-logger"
CONFIG_DIR="/etc/soc-logger"
LOG_DIR="/var/log/soc-logger"
SERVICE_NAME="soc-logger"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════╗"
echo "║       SOC Logger - Installation v1.0.0       ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# Verification root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Erreur: Ce script doit etre execute en tant que root${NC}"
    echo "Usage: sudo ./install.sh"
    exit 1
fi

# Fonction de log
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verification des dependances systeme
log_info "Verification des dependances systeme..."

if ! command -v python3 &> /dev/null; then
    log_error "Python 3 n'est pas installe"
    echo "Installation: apt-get install python3 python3-pip"
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
log_info "Python version: $PYTHON_VERSION"

if ! command -v pip3 &> /dev/null; then
    log_warn "pip3 n'est pas installe, installation..."
    apt-get update && apt-get install -y python3-pip
fi

# Creation des repertoires
log_info "Creation des repertoires..."

mkdir -p "$INSTALL_DIR"
mkdir -p "$CONFIG_DIR"
mkdir -p "$LOG_DIR"

# Copie des fichiers
log_info "Copie des fichiers..."

cp -r "$SCRIPT_DIR/core" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/main.py" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/requirements.txt" "$INSTALL_DIR/"

# Configuration
if [ ! -f "$CONFIG_DIR/config.yaml" ]; then
    log_info "Copie du fichier de configuration..."
    cp "$SCRIPT_DIR/config/config.yaml" "$CONFIG_DIR/"
    log_warn "N'oubliez pas de configurer votre webhook Discord dans $CONFIG_DIR/config.yaml"
else
    log_info "Fichier de configuration existant conserve"
fi

# Installation des dependances Python
log_info "Installation des dependances Python..."

pip3 install -r "$INSTALL_DIR/requirements.txt" --quiet

# Installation du service systemd
log_info "Installation du service systemd..."

cp "$SCRIPT_DIR/soc-logger.service" /etc/systemd/system/
systemctl daemon-reload

# Permissions
log_info "Configuration des permissions..."

chmod +x "$INSTALL_DIR/main.py"
chmod 600 "$CONFIG_DIR/config.yaml"
chmod 755 "$LOG_DIR"

# Finalisation
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗"
echo "║       Installation terminee avec succes!     ║"
echo "╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Prochaines etapes:${NC}"
echo ""
echo "1. Configurez votre webhook Discord:"
echo -e "   ${YELLOW}nano $CONFIG_DIR/config.yaml${NC}"
echo ""
echo "2. Testez la configuration:"
echo -e "   ${YELLOW}python3 $INSTALL_DIR/main.py --test${NC}"
echo ""
echo "3. Demarrez le service:"
echo -e "   ${YELLOW}systemctl start $SERVICE_NAME${NC}"
echo ""
echo "4. Activez le demarrage automatique:"
echo -e "   ${YELLOW}systemctl enable $SERVICE_NAME${NC}"
echo ""
echo -e "${BLUE}Commandes utiles:${NC}"
echo "  - Status:  systemctl status $SERVICE_NAME"
echo "  - Logs:    journalctl -u $SERVICE_NAME -f"
echo "  - Stop:    systemctl stop $SERVICE_NAME"
echo "  - Restart: systemctl restart $SERVICE_NAME"
echo ""
