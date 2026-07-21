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
