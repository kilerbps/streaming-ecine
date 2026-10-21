#!/usr/bin/env bash
# Envoie le commit courant (fichiers versionnés uniquement, jamais .env ni médias) dans
# /srv/ecine/src sur le VPS, puis indique la commande de déploiement (ADR-0016).
#
#   infra/upload.sh [hôte-ssh]      # par défaut : ecine-vps (~/.ssh/config)
set -euo pipefail

HOST=${1:-ecine-vps}
cd "$(git rev-parse --show-toplevel)"
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "Attention : modifications non commitées, non envoyées (seul HEAD part)." >&2
fi
REV=$(git rev-parse --short=12 HEAD)

# Extraction à part puis synchronisation : les dossiers gardent leur identité (Caddy monte infra/caddy).
git archive --format=tar HEAD | ssh "$HOST" "set -e
  rm -rf /srv/ecine/incoming && mkdir -p /srv/ecine/incoming /srv/ecine/src
  tar -x -C /srv/ecine/incoming
  echo $REV > /srv/ecine/incoming/REVISION
  rsync -a --delete /srv/ecine/incoming/ /srv/ecine/src/
  rm -rf /srv/ecine/incoming"

echo "Révision $REV envoyée sur $HOST."
echo "Déployer : ssh -t $HOST sudo /srv/ecine/src/infra/deploy.sh"
