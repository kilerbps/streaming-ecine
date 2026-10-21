#!/usr/bin/env bash
# Secrets et réglages de production dans /etc/ecine (ADR-0016, docs/deploiement-vps.md §5).
# Tirés sur le serveur, jamais affichés, jamais dans le dépôt ; les secrets externes (Resend,
# Turnstile, R2) se saisissent ici, masqués, jamais dans une conversation ou un ticket.
#
#   sudo infra/secrets.sh init                 # dossiers, mots de passe, secrets tirés (idempotent)
#   sudo infra/secrets.sh set api RESEND_API_KEY   # saisie masquée d'une valeur (api|web|compose|backup)
#   sudo infra/secrets.sh check                # liste les clés manquantes, sans aucune valeur
#   sudo infra/secrets.sh vapid                # paire Web Push (après la première construction)
#   sudo infra/secrets.sh admin                # premier SUPER_ADMIN (mot de passe tiré, rangé ici)
#   sudo infra/secrets.sh age                  # paire age des sauvegardes (clé privée à emporter)
#   sudo infra/secrets.sh r2                   # accès au compartiment R2 des sauvegardes
set -euo pipefail
umask 077

DIR=/etc/ecine
SECRETS=$DIR/secrets
INFRA=$(cd "$(dirname "$0")" && pwd)
COMPOSE=(docker compose --env-file "$DIR/compose.env" -f "$INFRA/docker-compose.prod.yml")

die() { echo "Erreur : $*" >&2; exit 1; }
[ "$(id -u)" = 0 ] || die "lancer avec sudo"

rand() { openssl rand -base64 48 | tr -d '\n'; }
rand_hex() { openssl rand -hex 32; }

# Valeur d'une clé (sans guillemets simples), vide si absente.
get_kv() {
  local file=$1 key=$2
  [ -f "$file" ] || return 0
  sed -n "s/^${key}=//p" "$file" | tail -n 1 | sed "s/^'\(.*\)'\$/\1/"
}

# Écrit KEY=valeur (remplace la ligne existante ou l'ajoute). La valeur passe par l'environnement,
# jamais par la ligne de commande ; entre guillemets simples quand elle n'est pas « simple » (Compose
# n'interpole rien entre guillemets simples, bash non plus).
set_kv() {
  local file=$1 key=$2
  KV_KEY=$key KV_VALUE=$3 awk '
    BEGIN {
      k = ENVIRON["KV_KEY"]; v = ENVIRON["KV_VALUE"]
      if (v !~ /^[A-Za-z0-9_.:\/@+=-]*$/) v = "\047" v "\047"
      line = k "=" v; done = 0
    }
    index($0, k "=") == 1 { if (!done) print line; done = 1; next }
    { print }
    END { if (!done) print line }
  ' "$file" > "$file.tmp"
  chmod 600 "$file.tmp"
  mv "$file.tmp" "$file"
}

file_of() {
  case $1 in
    api | web | compose | backup) echo "$DIR/$1.env" ;;
    *) die "fichier inconnu « $1 » (api, web, compose ou backup)" ;;
  esac
}

cmd_init() {
  install -d -m 700 -o root -g root "$DIR" "$SECRETS"
  for name in postgres_password redis_password; do
    if [ ! -s "$SECRETS/$name" ]; then
      rand_hex > "$SECRETS/$name"
      echo "Tiré : secrets/$name"
    fi
    # Lisible dans le conteneur (utilisateur postgres ou redis) ; le dossier reste réservé à root.
    chmod 644 "$SECRETS/$name"
  done
  for f in compose api web backup; do
    if [ ! -f "$DIR/$f.env" ]; then
      install -m 600 "$INFRA/env/$f.env.example" "$DIR/$f.env"
      echo "Créé : $DIR/$f.env"
    fi
  done
  local api=$DIR/api.env web=$DIR/web.env value key
  # Mots de passe des services dans les URL de connexion.
  value=$(get_kv "$api" DATABASE_URL)
  if [[ $value == *__POSTGRES_PASSWORD__* ]]; then
    set_kv "$api" DATABASE_URL "${value/__POSTGRES_PASSWORD__/$(cat "$SECRETS/postgres_password")}"
  fi
  value=$(get_kv "$api" REDIS_URL)
  if [[ $value == *__REDIS_PASSWORD__* ]]; then
    set_kv "$api" REDIS_URL "${value/__REDIS_PASSWORD__/$(cat "$SECRETS/redis_password")}"
  fi
  for key in JWT_ACCESS_SECRET PLAYBACK_TOKEN_SECRET IP_HASH_SALT SERVICE_API_KEY REVALIDATE_SECRET; do
    if [ "$(get_kv "$api" "$key")" = __GENERE__ ]; then
      set_kv "$api" "$key" "$(rand)"
      echo "Tiré : $key"
    fi
  done
  if [ "$(get_kv "$api" MEDIA_KEY_SECRET)" = __GENERE32__ ]; then
    set_kv "$api" MEDIA_KEY_SECRET "$(openssl rand -base64 32 | tr -d '\n')"
    echo "Tiré : MEDIA_KEY_SECRET (clé maîtresse : la perdre rend les vidéos illisibles, voir sauvegarde)"
  fi
  if [ "$(get_kv "$web" DEVICE_COOKIE_SECRET)" = __GENERE__ ]; then
    set_kv "$web" DEVICE_COOKIE_SECRET "$(rand)"
    echo "Tiré : DEVICE_COOKIE_SECRET"
  fi
  # Secrets partagés : toujours recopiés depuis l'API (une seule source).
  for key in SERVICE_API_KEY REVALIDATE_SECRET; do
    set_kv "$web" "$key" "$(get_kv "$api" "$key")"
  done
  echo "Prêt. Reste à saisir : sudo $0 check"
}

cmd_set() {
  [ $# -eq 2 ] || die "usage : $0 set api|web|compose|backup CLÉ"
  local file key=$2 value
  file=$(file_of "$1")
  [ -f "$file" ] || die "$file absent : lancer d'abord « $0 init »"
  [[ $key =~ ^[A-Z][A-Z0-9_]*$ ]] || die "nom de clé invalide"
  read -rsp "Valeur de $key (saisie masquée) : " value
  echo
  [ -n "$value" ] || die "valeur vide, rien n'est changé"
  [[ $value != *"'"* ]] || die "apostrophe refusée dans la valeur"
  set_kv "$file" "$key" "$value"
  echo "Enregistré : $key dans $file"
}

# Clés obligatoires par fichier (les autres ont une valeur par défaut ou sont facultatives).
REQUIRED_compose="SITE_DOMAIN API_DOMAIN MEDIA_DOMAIN ACME_EMAIL CADDY_ORIGIN TURNSTILE_SITE_KEY"
REQUIRED_api="DATABASE_URL REDIS_URL APP_URL API_PUBLIC_URL MEDIA_PUBLIC_URL JWT_ACCESS_SECRET PLAYBACK_TOKEN_SECRET MEDIA_KEY_SECRET IP_HASH_SALT SERVICE_API_KEY REVALIDATE_SECRET REVALIDATE_URL MAIL_FROM RESEND_API_KEY TURNSTILE_SECRET"
REQUIRED_web="API_INTERNAL_URL SITE_URL API_PUBLIC_URL MEDIA_PUBLIC_URL SERVICE_API_KEY REVALIDATE_SECRET DEVICE_COOKIE_SECRET"
REQUIRED_backup="AGE_RECIPIENT RCLONE_REMOTE RCLONE_CONFIG_R2_ENDPOINT RCLONE_CONFIG_R2_ACCESS_KEY_ID RCLONE_CONFIG_R2_SECRET_ACCESS_KEY"

cmd_check() {
  local missing=0 files=${*:-compose api web} f key value list
  for f in $files; do
    list=REQUIRED_$f
    [ -n "${!list:-}" ] || die "fichier inconnu « $f »"
    for key in ${!list}; do
      value=$(get_kv "$DIR/$f.env" "$key")
      if [ -z "$value" ] || [[ $value == *__GENERE* || $value == *__API__* || $value == *_PASSWORD__* ]]; then
        echo "Manquant : $f.env $key"
        missing=1
      fi
    done
  done
  for key in SERVICE_API_KEY REVALIDATE_SECRET; do
    if [ "$(get_kv "$DIR/web.env" "$key")" != "$(get_kv "$DIR/api.env" "$key")" ]; then
      echo "Différent : $key (api.env ≠ web.env, relancer « $0 init »)"
      missing=1
    fi
  done
  if [ $missing = 0 ]; then echo "Complet."; fi
  return $missing
}

cmd_vapid() {
  local api=$DIR/api.env image keys subject
  if [ -n "$(get_kv "$api" VAPID_PRIVATE_KEY)" ]; then
    echo "Paire VAPID déjà présente."
  else
    image="ecine-api:$(get_kv "$DIR/compose.env" TAG)"
    keys=$(docker run --rm --network none --entrypoint node "$image" -e \
      "import('web-push').then(({default: w}) => { const k = w.generateVAPIDKeys(); console.log(k.publicKey + ' ' + k.privateKey); })")
    set_kv "$api" VAPID_PUBLIC_KEY "${keys%% *}"
    set_kv "$api" VAPID_PRIVATE_KEY "${keys##* }"
    echo "Paire VAPID tirée (Web Push)."
  fi
  # Contact exigé par les services de notification : l'adresse du compte Let's Encrypt.
  subject=$(get_kv "$DIR/compose.env" ACME_EMAIL)
  if [ -n "$subject" ] && [ -z "$(get_kv "$api" VAPID_SUBJECT)" ]; then
    set_kv "$api" VAPID_SUBJECT "mailto:$subject"
    echo "VAPID_SUBJECT : mailto:$subject"
  fi
}

cmd_admin() {
  local email file=$SECRETS/admin-initial-password
  read -rp "E-mail du premier SUPER_ADMIN : " email
  [[ $email == *@*.* ]] || die "adresse invalide"
  [ -s "$file" ] || { rand | cut -c1-28 > "$file"; chmod 600 "$file"; }
  ADMIN_EMAIL=$email ADMIN_PASSWORD=$(cat "$file") \
    "${COMPOSE[@]}" run --rm --no-deps -e ADMIN_EMAIL -e ADMIN_PASSWORD api \
    node --enable-source-maps dist/maintenance/create-admin.js
  echo "Mot de passe initial : sudo cat $file (à changer à la première connexion, puis 2FA)."
}

cmd_age() {
  local backup=$DIR/backup.env owner=${SUDO_USER:-deploy} out
  out=$(getent passwd "$owner" | cut -d: -f6)/ecine-age-identity.txt
  command -v age-keygen >/dev/null || die "age absent (apt install age)"
  if [ -n "$(get_kv "$backup" AGE_RECIPIENT)" ]; then echo "Clé publique age déjà présente."; return; fi
  [ ! -e "$out" ] || die "$out existe déjà"
  age-keygen -o "$out" 2>/dev/null
  chown "$owner:" "$out"
  chmod 600 "$out"
  set_kv "$backup" AGE_RECIPIENT "$(age-keygen -y "$out")"
  echo "Clé publique enregistrée. Clé PRIVÉE : $out"
  echo "À copier hors du serveur (scp) puis à effacer ici (shred -u) : elle ne doit pas rester sur le VPS."
}

cmd_r2() {
  local backup=$DIR/backup.env account bucket id secret
  [ -f "$backup" ] || die "lancer d'abord « $0 init »"
  read -rp "Identifiant du compte Cloudflare (Account ID) : " account
  [[ $account =~ ^[0-9a-f]{32}$ ]] || die "identifiant attendu : 32 caractères hexadécimaux"
  read -rp "Nom du compartiment [ecine-sauvegardes] : " bucket
  bucket=${bucket:-ecine-sauvegardes}
  read -rsp "Access Key ID (saisie masquée) : " id
  echo
  read -rsp "Secret Access Key (saisie masquée) : " secret
  echo
  [ -n "$id" ] && [ -n "$secret" ] || die "clés vides"
  set_kv "$backup" RCLONE_CONFIG_R2_ENDPOINT "https://$account.r2.cloudflarestorage.com"
  set_kv "$backup" RCLONE_CONFIG_R2_ACCESS_KEY_ID "$id"
  set_kv "$backup" RCLONE_CONFIG_R2_SECRET_ACCESS_KEY "$secret"
  set_kv "$backup" RCLONE_REMOTE "r2:$bucket"
  echo "Test d'écriture dans r2:$bucket…"
  (
    set -a
    . "$backup"
    set +a
    echo "ecine $(date -u +%FT%TZ)" | rclone rcat "$RCLONE_REMOTE/test/ecriture.txt"
    rclone deletefile "$RCLONE_REMOTE/test/ecriture.txt"
  ) && echo "Accès R2 vérifié."
}

case ${1:-} in
  init) cmd_init ;;
  set) shift; cmd_set "$@" ;;
  check) shift; cmd_check "$@" ;;
  vapid) cmd_vapid ;;
  admin) cmd_admin ;;
  age) cmd_age ;;
  r2) cmd_r2 ;;
  *) sed -n '2,13p' "$0"; exit 1 ;;
esac
