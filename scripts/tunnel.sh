#!/bin/bash
# Voice Agent - Tailscale Tunnel Setup
# Creates a secure HTTPS tunnel from your local dev server to access via Tailscale

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Voice Agent - Tailscale Tunnel Setup${NC}"
echo "========================================"
echo ""

# Check if Tailscale is installed
if ! command -v tailscale &> /dev/null; then
    echo -e "${RED}Error: Tailscale is not installed.${NC}"
    echo ""
    echo "Install Tailscale:"
    echo "  macOS:   brew install tailscale"
    echo "  Linux:   curl -fsSL https://tailscale.com/install.sh | sh"
    echo "  Windows: https://tailscale.com/download"
    echo ""
    exit 1
fi

# Check if Tailscale is connected
if ! tailscale status &> /dev/null; then
    echo -e "${YELLOW}Tailscale is not connected. Starting login...${NC}"
    tailscale up
fi

# Get the port (default to 3000)
PORT="${1:-3000}"

echo -e "${GREEN}Setting up secure tunnel...${NC}"
echo ""

# Enable HTTPS serve for the local dev server
echo "Creating HTTPS tunnel for localhost:${PORT}..."

# Check if serve is already running
if tailscale serve status 2>/dev/null | grep -q ":${PORT}"; then
    echo -e "${YELLOW}Tunnel already exists for port ${PORT}${NC}"
else
    # Create the serve configuration
    tailscale serve https / http://127.0.0.1:${PORT}
    echo -e "${GREEN}Tunnel created successfully!${NC}"
fi

# Get the Tailscale hostname
HOSTNAME=$(tailscale status --json | grep -o '"Self":[^}]*"DNSName":"[^"]*"' | grep -o '"DNSName":"[^"]*"' | cut -d'"' -f4 | sed 's/\.$//')

if [ -z "$HOSTNAME" ]; then
    # Fallback method
    HOSTNAME=$(tailscale status | head -n1 | awk '{print $2}')
fi

echo ""
echo "========================================"
echo -e "${GREEN}Tunnel is active!${NC}"
echo ""
echo -e "Local URL:      ${BLUE}http://localhost:${PORT}${NC}"
echo -e "Tailscale URL:  ${BLUE}https://${HOSTNAME}${NC}"
echo ""
echo "Access your Voice Agent from any device on your Tailnet."
echo ""
echo -e "${YELLOW}Tips:${NC}"
echo "  - Share with teammates by adding their devices to your Tailnet"
echo "  - Use 'tailscale serve status' to check tunnel status"
echo "  - Use 'tailscale serve off' to disable the tunnel"
echo ""

# Optional: Enable Funnel for external access
read -p "Enable Funnel for public internet access? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${YELLOW}Enabling Funnel...${NC}"
    tailscale funnel 443 on
    echo ""
    echo -e "${GREEN}Funnel enabled!${NC}"
    echo "Your Voice Agent is now accessible from the public internet at:"
    echo -e "  ${BLUE}https://${HOSTNAME}${NC}"
    echo ""
    echo -e "${RED}Warning: Anyone with this URL can access your Voice Agent.${NC}"
fi
