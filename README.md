# ShopSense

Monorepo with three npm workspaces:

- `api` — NestJS backend
- `web` — React + Vite frontend
- `shared` — TypeScript types shared by `api` and `web` (`@shopsense/shared`)

## Setup

```bash
npm install
npm run build:shared
```

## Development

```bash
npm run dev:api   # start the NestJS backend
npm run dev:web   # start the Vite dev server
```

## Building

```bash
npm run build:shared
npm run build:api
npm run build:web
```

## Using shared types

`shared` builds to `dist/` with declaration files. `api` and `web` depend on it as
`@shopsense/shared` via npm workspaces:

```ts
import type { Product } from '@shopsense/shared';
```

Run `npm run build:shared` (or `npm run dev -w shared` to watch) after changing
types in `shared/src`, so consumers pick up the compiled output.

## Deploying the API

Build context is the repo root (the api workspace depends on the shared
workspace as a sibling, not a published package):

```bash
docker build -f Dockerfile -t shopsense-api .
docker run -p 3000:3000 --env-file api/.env shopsense-api
```

Required environment variables are validated at startup (see
`api/src/config/env.schema.ts`) — a missing or malformed one fails
immediately with a clear message rather than surfacing later mid-request.
See `api/.env.example` for the full list, including `CORS_ORIGIN` (the
frontend's origin(s), comma-separated).
