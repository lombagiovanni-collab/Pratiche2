#!/bin/bash
# ============================================================
# Setup Avvio Automatico – ABF Watcher
# ============================================================
# Esegui questo script UNA SOLA VOLTA per configurare il watcher
# in modo che parta automaticamente all'accensione del PC.
#
# Uso:
#   chmod +x setup_avvio_automatico.sh
#   ./setup_avvio_automatico.sh
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WATCHER_SCRIPT="$SCRIPT_DIR/watcher_decisioni_abf.py"
PYTHON=$(which python3)
SERVICE_NAME="abf-watcher"
SERVICE_FILE="$HOME/.config/systemd/user/${SERVICE_NAME}.service"

# Cartella da monitorare (modifica se necessario)
ABF_FOLDER="$HOME/Desktop/Decisioni ABF Utili"

echo ""
echo "=== Setup ABF Watcher ==="
echo "Cartella monitorata : $ABF_FOLDER"
echo "Script              : $WATCHER_SCRIPT"
echo ""

# Crea la cartella se non esiste
mkdir -p "$ABF_FOLDER"
mkdir -p "$HOME/.config/systemd/user"

# Crea il file di servizio systemd
cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=ABF Watcher – elaborazione automatica decisioni ABF
After=network.target graphical-session.target

[Service]
Type=simple
ExecStart=$PYTHON $WATCHER_SCRIPT "$ABF_FOLDER"
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
# Aggiungi qui la tua chiave API Anthropic per sintesi con Claude AI:
# Environment="ANTHROPIC_API_KEY=sk-ant-..."

[Install]
WantedBy=default.target
EOF

echo "File servizio creato: $SERVICE_FILE"

# Abilita e avvia il servizio
systemctl --user daemon-reload
systemctl --user enable "${SERVICE_NAME}.service"
systemctl --user start "${SERVICE_NAME}.service"

echo ""
echo "=== Fatto! ==="
echo ""
echo "Il watcher è ora attivo e si avvierà automaticamente all'accensione del PC."
echo ""
echo "Comandi utili:"
echo "  Stato    : systemctl --user status $SERVICE_NAME"
echo "  Log live : journalctl --user -u $SERVICE_NAME -f"
echo "  Ferma    : systemctl --user stop $SERVICE_NAME"
echo "  Disabilita: systemctl --user disable $SERVICE_NAME"
echo ""
echo "Per aggiungere la chiave Claude AI, modifica il file:"
echo "  $SERVICE_FILE"
echo "  (riga: Environment=\"ANTHROPIC_API_KEY=sk-ant-...\")"
echo "  Poi esegui: systemctl --user daemon-reload && systemctl --user restart $SERVICE_NAME"
echo ""
