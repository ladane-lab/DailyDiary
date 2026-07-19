// @ts-ignore
import LRUCache from 'lru-cache';
import logger from './logger.js';

class CacheService {
  private cache: LRUCache<string, any>;
  private inflight = new Map<string, Promise<any>>();
  private metrics = {
    hits: 0,
    misses: 0,
    dbFetchCount: 0,
    totalDbFetchTimeMs: 0,
    evictions: 0,
  };

  constructor(max = 100, ttl = 300000) {
    this.cache = new LRUCache({
      max,
      maxAge: ttl,
      stale: false,
      dispose: (key: any, value: any) => {
        // In v5 it's evictions if called
        this.metrics.evictions++;
      }
    });

    // Periodic memory monitoring
    setInterval(() => {
      const mem = process.memoryUsage();
      const rss = (mem.rss / 1024 / 1024).toFixed(2);
      const heap = (mem.heapUsed / 1024 / 1024).toFixed(2);
      const { hits, misses, hitRate } = this.stats();
      logger.info(`[CACHE MEMORY] RSS: ${rss}MB | Heap: ${heap}MB | Hit Rate: ${hitRate}`);
    }, 60000); // every minute
  }

  get<T>(key: string): T | undefined {
    const val = this.cache.get(key) as T | undefined;
    if (val !== undefined) {
      this.metrics.hits++;
      logger.info(`[CACHE HIT] ⚡ ${key}`);
    } else {
      this.metrics.misses++;
      logger.info(`[CACHE MISS] ⏳ ${key}`);
    }
    return val;
  }

  set<T>(key: string, value: T, customTtl?: number): void {
    if (customTtl !== undefined) {
      this.cache.set(key, value, customTtl);
    } else {
      this.cache.set(key, value);
    }
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    logger.info(`[CACHE INVALIDATE] Cleared ${count} keys starting with "${prefix}"`);
  }

  clear(): void {
    this.cache.clear();
    logger.info('[CACHE CLEAR] Cache completely flushed');
  }

  async getOrFetch<T>(key: string, fetcher: () => Promise<T>, customTtl?: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;

    const existingPromise = this.inflight.get(key) as Promise<T> | undefined;
    if (existingPromise) {
      logger.info(`[CACHE STAMPEDE PREVENTED] 🛡️ Waiting for inflight query: ${key}`);
      return existingPromise;
    }

    const promise = (async () => {
      try {
        const start = performance.now();
        const data = await fetcher();
        const end = performance.now();

        this.metrics.dbFetchCount++;
        this.metrics.totalDbFetchTimeMs += (end - start);

        this.set(key, data, customTtl);
        return data;
      } finally {
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, promise);
    return promise;
  }

  stats() {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    const hitRate = totalRequests === 0 ? "0%" : `${((this.metrics.hits / totalRequests) * 100).toFixed(1)}%`;
    const avgDbTime = this.metrics.dbFetchCount === 0 ? "0ms" : `${(this.metrics.totalDbFetchTimeMs / this.metrics.dbFetchCount).toFixed(2)}ms`;
    
    return {
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      hitRate,
      evictions: this.metrics.evictions,
      avgDbFetchTime: avgDbTime,
      itemCount: this.cache.size,
    };
  }
}

export const appCache = new CacheService();
