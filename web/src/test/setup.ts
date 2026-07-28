import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest doesn't run with Jest-style global `afterEach` unless `test.globals`
// is enabled, which RTL's own auto-cleanup relies on detecting -- without
// this, elements from one test's render leak into the next within the same
// file (multiple "Sign in" buttons, stale form state, etc).
afterEach(cleanup);
