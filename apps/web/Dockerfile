# syntax=docker/dockerfile:1
# Site E-Ciné (Next.js, sortie autonome) — contexte de build = RACINE du dépôt (workspace pnpm).
#
#   docker build -f apps/web/Dockerfile -t ecine-web \
#     --build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY=… .
#
# Les variables NEXT_PUBLIC_* sont figées dans le JavaScript du navigateur à la construction : une
# image par environnement. Tout le reste (adresses, secrets) est lu à l'exécution (/etc/ecine/web.env).

ARG NODE_IMAGE=node:24-alpine

FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    CI=true \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable pnpm
WORKDIR /repo

# ——— Construction : dépendances du site, contrats puis site ———
FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile --filter "@ecine/web..."
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=""
ARG NEXT_PUBLIC_VIEW_TRANSITIONS="0"
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY \
    NEXT_PUBLIC_VIEW_TRANSITIONS=$NEXT_PUBLIC_VIEW_TRANSITIONS
# Valeurs provisoires pour `next build` (aucune page n'appelle l'API à la construction) ; les vraies
# valeurs sont lues à l'exécution.
RUN API_INTERNAL_URL=http://api.invalid:4000 \
    SITE_URL=https://build.invalid \
    API_PUBLIC_URL=https://api.build.invalid \
    MEDIA_PUBLIC_URL=https://media.build.invalid \
    SERVICE_API_KEY=construction-seulement-construction-seulement \
    REVALIDATE_SECRET=construction-seulement-construction-seulement \
    DEVICE_COOKIE_SECRET=construction-seulement-construction-seulement \
    pnpm --filter @ecine/contracts build && pnpm --filter @ecine/web build

# ——— Exécution : serveur autonome, utilisateur non root ———
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
# Cache de données de Next.js (revalidé par étiquettes depuis l'API) : volume monté ici.
RUN mkdir -p /app/apps/web/.next/cache && chown node:node /app/apps/web/.next/cache
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
CMD ["node", "apps/web/server.js"]
