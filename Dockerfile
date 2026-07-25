# Builds the api service. Build context must be the repo root (this
# monorepo's api workspace depends on @shopsense/shared as a sibling
# workspace, not a published package), e.g.:
#   docker build -f Dockerfile -t shopsense-api .

# ---- build: compiles TypeScript for shared and api ----
FROM node:22-alpine AS build
WORKDIR /app

# Workspace manifests only, first, so `npm ci` is cached across builds that
# only change source files. web/package.json is included purely so npm can
# resolve the workspaces array in the root package.json -- its dependencies
# are never installed in the runtime stage below.
COPY package.json package-lock.json ./
COPY api/package.json ./api/package.json
COPY shared/package.json ./shared/package.json
COPY web/package.json ./web/package.json
RUN npm ci

COPY shared ./shared
COPY api ./api
RUN npm run build -w shared
RUN npm run build -w api

# ---- runtime: only compiled output and production dependencies ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY api/package.json ./api/package.json
COPY shared/package.json ./shared/package.json
COPY web/package.json ./web/package.json
# Scoped to api+shared so web's React/Vite dependencies never end up in the
# deployed image -- smaller image, smaller attack surface.
RUN npm ci --omit=dev --workspace=api --workspace=shared

COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/api/dist ./api/dist

EXPOSE 3000
WORKDIR /app/api
CMD ["node", "dist/main.js"]
