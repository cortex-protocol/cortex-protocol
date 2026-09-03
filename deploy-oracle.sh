#!/bin/bash
# ==============================================================================
# 🧠 CORTEX PROTOCOL ($CTX) - ORACLE CLOUD SERVER DEPLOYMENT SCRIPT
# ==============================================================================
# Ce script configure automatiquement votre serveur Oracle Cloud (Ubuntu/Debian)
# pour faire tourner le Nœud Maître 24h/24 avec l'Explorateur Web et le Réseau P2P.
# ==============================================================================

set -e

echo "========================================================="
echo "🧠 INSTALLATION DU NŒUD CORTEX PROTOCOL SUR ORACLE CLOUD"
echo "========================================================="

# 1. Mise à jour du système
echo "[1/5] Mise à jour des paquets système..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw build-essential

# 2. Installation de Node.js v22
echo "[2/5] Installation de Node.js v22..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt install -y nodejs
fi
echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# 3. Installation de PM2 (Gestionnaire de processus 24h/24)
echo "[3/5] Installation de PM2 pour exécution 24/7..."
sudo npm install -g pm2

# 4. Configuration du Pare-feu (Firewall)
echo "[4/5] Ouverture des ports HTTP (3000) et P2P (6001)..."
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 6001 -j ACCEPT
sudo netfilter-persistent save 2>/dev/null || true

# 5. Compilation & Lancement avec PM2
echo "[5/5] Compilation et lancement du Nœud Cortex..."
npm install
npm run build
mkdir -p dist/web
cp -r src/web/* dist/web/

# Lancement avec PM2
pm2 stop cortex-node 2>/dev/null || true
pm2 start dist/index.js --name "cortex-node"
pm2 save
pm2 startup | tail -n 1 | bash 2>/dev/null || true

echo "========================================================="
echo "🎉 CORTEX PROTOCOL EST DÉPLOYÉ AVEC SUCCÈS !"
echo "========================================================="
echo "Accédez à votre explorateur Web en direct :"
echo "👉 http://$(curl -s ifconfig.me):3000"
echo ""
echo "Commandes utiles :"
echo "- Voir les logs en direct : pm2 logs cortex-node"
echo "- Arrêter le nœud         : pm2 stop cortex-node"
echo "- Redémarrer le nœud      : pm2 restart cortex-node"
echo "========================================================="
