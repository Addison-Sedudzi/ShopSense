// Kept in sync manually with global-setup.js / global-teardown.js, which are
// plain JS (Jest's globalSetup/globalTeardown load outside the ts-jest
// transform, so they can't import this file directly).
export const E2E_CONTAINER_NAME = 'shopsense-e2e-postgres';
export const E2E_DB_PORT = 15433;
export const E2E_DATABASE_URL = `postgresql://postgres:test@localhost:${E2E_DB_PORT}/postgres`;
