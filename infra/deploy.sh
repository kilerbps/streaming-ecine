#!/usr/bin/env bash
# Déploiement sur le VPS (ADR-0016, docs/deploiement-vps.md §3) : construit les images de la
# révision envoyée par infra/upload.sh, applique les migrations, puis remplace les instances une à
# une (les nouvelles doivent être saines avant que les anciennes ne s'arrêtent : pas de coupure).
#
#   sudo /srv/ecine/src/infra/deploy.sh              # révision présente dans /srv/ecine/src
#   sudo /srv/ecine/src/infra/deploy.sh --rollback   # images de la révision précédente (sans migration)
#
# Les migrations ne reviennent jamais en arrière : une révision précédente doit rester compatible
# avec le schéma en place (migrations additives, docs/skills/ecine-prisma-postgres).
set -euo pipefail

DIR=/etc/ecine
INFRA=$(cd "$(dirname "$0")" && pwd)
COMPOSE=(docker compose --env-file "$DIR/compose.env" -f "$INFRA/docker-compose.prod.yml")

die() { echo "Erreur : $*" >&2; exit 1; }
step() { echo; echo "▸ $*"; }
[ "$(id -u)" = 0 ] || die "lancer avec sudo"

"$INFRA/secrets.sh" check >/dev/null || { "$INFRA/secrets.sh" check || true; die "secrets incomplets"; }

current=$(sed -n 's/^TAG=//p' "$DIR/compose.env")
if [ "${1:-}" = --rollback ]; then
  TAG=$(cat "$DIR/deployed-tag.prev" 2>/dev/null) || die "aucune révision précédente"
  echo "Retour à la révision $TAG (actuelle : $current)."
else
  TAG=$(cat "$INFRA/../REVISION" 2>/dev/null) || die "REVISION absent : envoyer le code avec infra/upload.sh"
fi
export TAG

# Instances d'un service remplacées sans coupure : les nouvelles démarrent à côté des anciennes,
# les anciennes s'arrêtent quand les nouvelles sont saines (Caddy écarte une instance qui ne répond
# plus et relit le DNS de Docker toutes les 10 s). Échec : les nouvelles sont retirées.
roll() {
  local svc=$1 count=$2 old new id status deadline
  old=$("${COMPOSE[@]}" ps -q "$svc")
  if [ -z "$old" ]; then
    "${COMPOSE[@]}" up -d --no-deps --wait "$svc"
    return
  fi
  "${COMPOSE[@]}" up -d --no-deps --no-recreate --scale "$svc=$((count * 2))" "$svc"
  new=$(comm -13 <(echo "$old" | sort) <("${COMPOSE[@]}" ps -q "$svc" | sort))
  [ -n "$new" ] || die "$svc : aucune nouvelle instance"
  deadline=$((SECONDS + 180))
  for id in $new; do
    while :; do
      status=$(docker inspect -f '{{.State.Health.Status}}' "$id")
      [ "$status" = healthy ] && break
      if [ "$status" = unhealthy ] || [ $SECONDS -ge $deadline ]; then
        docker logs --tail 40 "$id" >&2 || true
        # shellcheck disable=SC2086
        docker rm -f $new >/dev/null
        die "$svc : nouvelle instance non saine ($status), anciennes instances conservées"
      fi
      sleep 3
    done
  done
  # Laisse Caddy découvrir les nouvelles adresses avant de couper les anciennes.
  sleep 12
  # shellcheck disable=SC2086
  docker stop -t 30 $old >/dev/null
  # shellcheck disable=SC2086
  docker rm $old >/dev/null
  echo "$svc : $(echo "$new" | wc -w) instance(s) remplacée(s)."
}

if [ "${1:-}" != --rollback ]; then
  step "Construction des images (révision $TAG)"
  "${COMPOSE[@]}" build api worker migrate web

  step "Base de données et Redis"
  "${COMPOSE[@]}" up -d --wait postgres redis

  step "Migrations"
  "${COMPOSE[@]}" run --rm migrate
fi

step "API (deux instances)"
roll api 2

step "Site"
roll web 1

step "Worker"
"${COMPOSE[@]}" up -d --no-deps worker

step "Caddy"
if [ -z "$("${COMPOSE[@]}" ps -q caddy)" ]; then
  "${COMPOSE[@]}" up -d --no-deps caddy
else
  # Recréé seulement si sa configuration Compose change (ex. CADDY_ORIGIN) ; sinon rechargé à chaud.
  "${COMPOSE[@]}" up -d --no-deps caddy
  "${COMPOSE[@]}" exec -T caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
fi

step "Vérifications"
"${COMPOSE[@]}" exec -T caddy wget -qO- http://127.0.0.1:8080/health >/dev/null && echo "API via Caddy : OK"
"${COMPOSE[@]}" exec -T web wget -qO- http://127.0.0.1:3000/api/health >/dev/null && echo "Site : OK"

if [ "$TAG" != "$current" ]; then
  if [ "$current" != latest ]; then echo "$current" > "$DIR/deployed-tag.prev"; fi
  sed -i "s/^TAG=.*/TAG=$TAG/" "$DIR/compose.env"
fi
docker image prune -f >/dev/null
echo
echo "Révision $TAG en service."
"${COMPOSE[@]}" ps --format 'table {{.Name}}\t{{.Status}}'
