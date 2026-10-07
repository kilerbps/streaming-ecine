#!/usr/bin/env sh
# Sauvegarde quotidienne chiffrée (docs/02-ARCHITECTURE.md §9, docs/06-SECURITY.md §8).
# - pg_dump au format custom, chiffré avec age (clé publique uniquement sur le VPS),
# - copie hors du VPS vers un stockage objet compatible S3 (rclone, remote « ecine-backup »),
# - rétention 30 jours, échec bruyant (code ≠ 0) pour déclencher une alerte.
#
# Cron (root) : 15 2 * * * /opt/ecine/infra/backup/backup.sh >> /var/log/ecine-backup.log 2>&1
# Prérequis : docker, age, rclone ; /etc/ecine/backup.env (AGE_RECIPIENT, RCLONE_REMOTE).
set -eu

. /etc/ecine/backup.env
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

echo "[$STAMP] Sauvegarde de la base…"
docker compose -f /opt/ecine/infra/docker-compose.prod.yml exec -T postgres \
  pg_dump -U ecine -d ecine --format=custom --no-owner \
  | age -r "$AGE_RECIPIENT" > "$WORK/ecine-db-$STAMP.dump.age"

test -s "$WORK/ecine-db-$STAMP.dump.age" || { echo "Sauvegarde vide : échec" >&2; exit 1; }

echo "Envoi hors site…"
rclone copy "$WORK/ecine-db-$STAMP.dump.age" "$RCLONE_REMOTE/db/"

echo "Rétention 30 jours…"
rclone delete --min-age 30d "$RCLONE_REMOTE/db/"

# Médias : sources et HLS finaux synchronisés (les sources permettent de retranscoder).
echo "Synchronisation des médias…"
rclone sync /var/lib/docker/volumes/ecine_storage/_data "$RCLONE_REMOTE/storage/" --exclude "uploads/**"

echo "[$STAMP] Sauvegarde terminée."
