#!/bin/bash
#
# SOC Logger - Script de desinstallation
# ======================================
#
# Usage: sudo ./uninstall.sh
#

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Variables
INSTALL_DIR="/opt/soc-logger"
CONFIG_DIR="/etc/soc-logger"
LOG_DIR="/var/log/soc-logger"
SERVICE_NAME="soc-logger"

echo -e "${YELLOW}"
echo "╔══════════════════════════════════════════════╗"
echo "║      SOC Logger - Desinstallation            ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# Verification root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Erreur: Ce script doit etre execute en tant que root${NC}"
    exit 1
fi

read -p "Etes-vous sur de vouloir desinstaller SOC Logger? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Desinstallation annulee"
    exit 0
fi

# Arret du service
echo -e "${YELLOW}[INFO]${NC} Arret du service..."
systemctl stop $SERVICE_NAME 2>/dev/null || true
systemctl disable $SERVICE_NAME 2>/dev/null || true

# Suppression du service
echo -e "${YELLOW}[INFO]${NC} Suppression du service systemd..."
rm -f /etc/systemd/system/$SERVICE_NAME.service
systemctl daemon-reload

# Suppression des fichiers
echo -e "${YELLOW}[INFO]${NC} Suppression des fichiers..."
rm -rf "$INSTALL_DIR"

# Demander pour les logs et config
read -p "Supprimer les fichiers de configuration? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf "$CONFIG_DIR"
fi

read -p "Supprimer les fichiers de logs? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf "$LOG_DIR"
fi

echo ""
echo -e "${GREEN}Desinstallation terminee!${NC}"
