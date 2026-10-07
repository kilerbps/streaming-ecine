# syntax=docker/dockerfile:1
# API E-Ciné et worker de transcodage — contexte de build = RACINE du dépôt (workspace pnpm).
#
#   docker build -f apps/api/Dockerfile --target api     -t ecine-api .
#   docker build -f apps/api/Dockerfile --target worker  -t ecine-worker .
#   docker build -f apps/api/Dockerfile --target migrate -t ecine-migrate .
#
# Migrations : avant de démarrer une nouvelle version, appliquer les migrations versionnées
# (`prisma migrate deploy`, jamais `migrate dev` en production) :
#   docker run --rm --env-file /etc/ecine/api.env ecine-migrate
#
# L'API et le worker doivent partager le même volume STORAGE_DIR (défaut /data/storage) :
# images publiques, sources et HLS privés. Lancer les conteneurs avec `--init` (signaux propres).

ARG NODE_IMAGE=node:24-alpine

# ——— Outils communs : pnpm via corepack (version lue dans package.json « packageManager ») ———
FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    CI=true
# Si corepack refuse la signature de pnpm (clés renouvelées), mettre à jour l'image Node de base.
RUN corepack enable pnpm
WORKDIR /repo

# ——— Build : dépendances complètes, client Prisma généré, contracts puis API compilés ———
FROM base AS build
# OpenSSL : requis par le moteur de migration Prisma (cible migrate).
RUN apk add --no-cache openssl
COPY . .
RUN pnpm install --frozen-lockfile --filter "@ecine/api..."
RUN pnpm --filter @ecine/contracts build && pnpm --filter @ecine/api build

# ——— Dépendances de production seules (le client Prisma est déjà compilé dans dist) ———
FROM base AS prod-deps
COPY . .
RUN pnpm install --frozen-lockfile --prod --ignore-scripts --filter "@ecine/api..."

# ——— Fichiers d'exécution (liens symboliques pnpm relatifs : arborescence conservée) ———
FROM scratch AS app-files
COPY --from=prod-deps /repo/package.json /app/package.json
COPY --from=prod-deps /repo/node_modules /app/node_modules
COPY --from=prod-deps /repo/packages/contracts/package.json /app/packages/contracts/package.json
COPY --from=prod-deps /repo/packages/contracts/node_modules /app/packages/contracts/node_modules
COPY --from=build /repo/packages/contracts/dist /app/packages/contracts/dist
COPY --from=prod-deps /repo/apps/api/package.json /app/apps/api/package.json
COPY --from=prod-deps /repo/apps/api/node_modules /app/apps/api/node_modules
COPY --from=build /repo/apps/api/dist /app/apps/api/dist

# ——— Base d'exécution : utilisateur non root, stockage inscriptible ———
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    STORAGE_DIR=/data/storage
RUN mkdir -p /data/storage && chown node:node /data/storage
WORKDIR /app/apps/api

# ——— Cible API (HTTP, port 4000) ———
FROM runtime AS api
COPY --from=app-files /app /app
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:4000/health || exit 1
CMD ["node", "--enable-source-maps", "dist/main.js"]

# ——— Cible worker (transcodage FFmpeg, aucun port) ———
FROM runtime AS worker
RUN apk add --no-cache ffmpeg
COPY --from=app-files /app /app
USER node
CMD ["node", "--enable-source-maps", "dist/worker.js"]

# ——— Cible migrate : `prisma migrate deploy` (CLI Prisma présente dans les dépendances de build) ———
FROM build AS migrate
WORKDIR /repo/apps/api
USER node
CMD ["node_modules/.bin/prisma", "migrate", "deploy"]
