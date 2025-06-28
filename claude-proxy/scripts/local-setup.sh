#!/bin/bash

# 🚀 Claude Proxy Bridge Local Setup Script
# This script sets up the Claude proxy bridge to run locally for GitHub Actions

set -e

echo "🔗 Setting up Claude Proxy Bridge for local GitHub Actions..."

# Create necessary directories
mkdir -p logs config

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your actual configuration before starting the server"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate API key if not exists
if ! grep -q "AUTHORIZED_API_KEYS=" .env || grep -q "AUTHORIZED_API_KEYS=$" .env; then
    echo "🔑 Generating API key..."
    API_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    sed -i.bak "s/AUTHORIZED_API_KEYS=.*/AUTHORIZED_API_KEYS=${API_KEY}/" .env
    echo "✅ Generated API key: ${API_KEY}"
    echo "💡 Save this key for use in GitHub Actions secrets"
fi

# Create systemd service file for Linux
if command -v systemctl &> /dev/null; then
    echo "🐧 Creating systemd service..."
    cat > claude-proxy.service << EOF
[Unit]
Description=Claude Proxy Bridge
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
    echo "📋 Systemd service file created: claude-proxy.service"
    echo "   To install: sudo cp claude-proxy.service /etc/systemd/system/"
    echo "   To enable: sudo systemctl enable claude-proxy"
    echo "   To start: sudo systemctl start claude-proxy"
fi

# Create macOS launchd plist for macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Creating macOS LaunchAgent..."
    cat > ~/Library/LaunchAgents/com.claude.proxy.bridge.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.claude.proxy.bridge</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>$(pwd)/src/server.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$(pwd)</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$(pwd)/logs/stdout.log</string>
    <key>StandardErrorPath</key>
    <string>$(pwd)/logs/stderr.log</string>
</dict>
</plist>
EOF
    echo "📋 LaunchAgent created: ~/Library/LaunchAgents/com.claude.proxy.bridge.plist"
    echo "   To load: launchctl load ~/Library/LaunchAgents/com.claude.proxy.bridge.plist"
    echo "   To start: launchctl start com.claude.proxy.bridge"
fi

# Create Windows service script
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    echo "🪟 Creating Windows service script..."
    cat > install-service.ps1 << 'EOF'
# PowerShell script to install Claude Proxy Bridge as Windows service
# Run as Administrator

$serviceName = "ClaudeProxyBridge"
$serviceDisplayName = "Claude Proxy Bridge"
$serviceDescription = "Local proxy bridge for Claude API to GitHub Actions"
$nodePath = (Get-Command node).Source
$scriptPath = "$PSScriptRoot\src\server.js"

# Install node-windows if not already installed
if (!(Get-Command nssm -ErrorAction SilentlyContinue)) {
    Write-Host "Installing NSSM (Non-Sucking Service Manager)..."
    choco install nssm -y
}

# Create the service
nssm install $serviceName $nodePath $scriptPath
nssm set $serviceName AppDirectory $PSScriptRoot
nssm set $serviceName Description "$serviceDescription"
nssm set $serviceName Start SERVICE_AUTO_START

Write-Host "✅ Service installed. Start with: nssm start $serviceName"
EOF
    echo "📋 Windows service script created: install-service.ps1"
    echo "   Run as Administrator: powershell -ExecutionPolicy Bypass -File install-service.ps1"
fi

echo ""
echo "🎯 Setup completed! Next steps:"
echo ""
echo "1. 📝 Edit .env file with your Anthropic API key and configuration"
echo "2. 🚀 Start the server:"
echo "   Development: npm run dev"
echo "   Production:  npm start"
echo "   Docker:      docker-compose up -d"
echo ""
echo "3. 🔗 Update your GitHub Actions to use the local proxy:"
echo "   Add to your workflow:"
echo "   env:"
echo "     CLAUDE_PROXY_URL: http://localhost:3000"
echo "     CLAUDE_API_KEY: \${{ secrets.CLAUDE_PROXY_API_KEY }}"
echo ""
echo "4. 🧪 Test the setup:"
echo "   curl http://localhost:3000/health"
echo ""
echo "📚 API Endpoints:"
echo "   Health:        GET  /health"
echo "   Status:        GET  /api/status" 
echo "   Claude API:    POST /api/claude/messages"
echo "   GitHub Actions: POST /api/github-actions/claude"
echo "   Metrics:       GET  /api/metrics"
echo ""