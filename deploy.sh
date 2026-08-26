#!/usr/bin/env bash
# Pulls the latest main, rebuilds, and restarts the app service on this box.
# Run from anywhere; resolves its own location. Does NOT touch livekit-server
# (livekit/livekit.yaml is gitignored and never changes via git pull) or Caddy.
set -euo pipefail

cd "$(dirname "$(readlink -f "$0")")"

echo "==> git pull"
git pull --ff-only origin main

echo "==> server deps"
(cd server && npm ci --omit=dev)

echo "==> client deps + build"
(cd client && npm ci && npm run build)

echo "==> restarting counsel-culture service"
sudo systemctl restart counsel-culture

sleep 2
echo "==> status"
sudo systemctl is-active counsel-culture
curl -sf http://localhost:3001/health && echo
echo "==> done: $(git rev-parse --short HEAD)"
