#!/bin/bash
# ==============================================================================
# 🧠 CORTEX PROTOCOL ($CTX) - CLOUD SERVER DEPLOYMENT SCRIPT
# ==============================================================================
# This script automatically configures your cloud server (Ubuntu/Debian)
# to run the Cortex Master Node 24/7 with the Web Explorer and P2P Network.
# ==============================================================================

set -e

echo "========================================================="
echo "🧠 INSTALLING CORTEX PROTOCOL NODE ON CLOUD SERVER"
echo "========================================================="

# 1. System Update
echo "[1/5] Updating system packages..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw build-essential

# 2. Install Node.js v22
echo "[2/5] Installing Node.js v22..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt install -y nodejs
fi
echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# 3. Install PM2 (24/7 Process Manager)
echo "[3/5] Installing PM2 for 24/7 background execution..."
sudo npm install -g pm2

# 4. Configure Firewall
echo "[4/5] Opening HTTP (3000), P2P (6001), and Stratum (3333) ports..."
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 6001 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3333 -j ACCEPT
sudo netfilter-persistent save 2>/dev/null || true

# 5. Build & Launch with PM2
echo "[5/5] Building and starting Cortex Master Node..."
npm install
npm run build
mkdir -p dist/web
cp -r src/web/* dist/web/

# Launch with PM2
pm2 stop cortex-node 2>/dev/null || true
pm2 start dist/index.js --name "cortex-node"
pm2 save
pm2 startup | tail -n 1 | bash 2>/dev/null || true

echo "========================================================="
echo "🎉 CORTEX PROTOCOL NODE DEPLOYED SUCCESSFULLY!"
echo "========================================================="
echo "Access your live Web Explorer at:"
echo "👉 http://$(curl -s ifconfig.me):3000"
echo ""
echo "Useful Commands:"
echo "- View live logs   : pm2 logs cortex-node"
echo "- Stop node        : pm2 stop cortex-node"
echo "- Restart node     : pm2 restart cortex-node"
echo "========================================================="
