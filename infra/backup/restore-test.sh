#!/usr/bin/env bash
# Test de restauration MENSUEL (obligatoire, docs/01-PRD.md §7) : restaure la dernière sauvegarde
# dans une base jetable et vérifie qu'elle contient des données. Ne touche jamais à la base de production.
#
# Usage : AGE_IDENTITY=/chemin/cle-privee.txt ./restore-test.sh
# La clé privée age n'est PAS stockée sur le VPS : lancer ce test depuis un poste d'administration.
set -euo pipefail

# Sur le poste d’administration : BACKUP_ENV=./backup.env (RCLONE_REMOTE) ; sur le VPS : /etc/ecine/backup.env.
set -a
. "${BACKUP_ENV:-/etc/ecine/backup.env}"
set +a
WORK=$(mktemp -d)
trap 'docker rm -f ecine-restore-test >/dev/null 2>&1 || true; rm -rf "$WORK"' EXIT

LAST=$(rclone lsf "$RCLONE_REMOTE/db/" | sort | tail -n 1)
test -n "$LAST" || { echo "Aucune sauvegarde trouvée" >&2; exit 1; }
echo "Dernière sauvegarde : $LAST"
rclone copy "$RCLONE_REMOTE/db/$LAST" "$WORK/"
age -d -i "$AGE_IDENTITY" "$WORK/$LAST" > "$WORK/restore.dump"

docker run -d --name ecine-restore-test -e POSTGRES_PASSWORD=restore-test -e POSTGRES_USER=ecine -e POSTGRES_DB=ecine postgres:18-alpine >/dev/null
until docker exec ecine-restore-test pg_isready -U ecine -d ecine >/dev/null 2>&1; do sleep 2; done
docker cp "$WORK/restore.dump" ecine-restore-test:/tmp/restore.dump
docker exec ecine-restore-test pg_restore -U ecine -d ecine --no-owner /tmp/restore.dump

FILMS=$(docker exec ecine-restore-test psql -U ecine -d ecine -tAc 'SELECT count(*) FROM films')
USERS=$(docker exec ecine-restore-test psql -U ecine -d ecine -tAc 'SELECT count(*) FROM users')
echo "Restauration OK : $FILMS film(s), $USERS compte(s). Consigner le résultat dans docs/exploitation.md."
