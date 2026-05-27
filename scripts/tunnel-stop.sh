#!/bin/bash
# Stop the Tailscale tunnel

set -e

echo "Stopping Tailscale tunnel..."

# Turn off serve
tailscale serve off 2>/dev/null || true

# Turn off funnel if enabled
tailscale funnel 443 off 2>/dev/null || true

echo "Tunnel stopped."
