import { Injectable } from '@nestjs/common';

interface CacheEntry {
  value: unknown;
  marker: string;
  expiresAt: number;
}

/**
 * In-memory, per-process cache so a restock recommendation or daily briefing
 * isn't recomputed (and re-billed to Claude) on every page load. Two
 * invalidation paths: a TTL backstop, and a caller-supplied `marker` —
 * typically the latest relevant activity timestamp (last sale, last stock
 * movement) — so new sales invalidate the cache without this module needing
 * to know about SalesRepository or StockMovementsRepository directly.
 *
 * Lost on process restart and not shared across instances; fine for a
 * single-instance mini-project deployment, not for a horizontally-scaled one.
 */
@Injectable()
export class IntelligenceCache {
  private readonly store = new Map<string, CacheEntry>();

  get<T>(key: string, currentMarker: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt || entry.marker !== currentMarker) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set(key: string, value: unknown, ttlMs: number, marker: string): void {
    this.store.set(key, { value, marker, expiresAt: Date.now() + ttlMs });
  }
}
