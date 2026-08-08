import { Redis } from '@upstash/redis';
import logger from '../lib/logger.js';

interface RateLimitResult {
  limited: boolean;
  current: number;
  resetTimeMs: number;
}

interface IRedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<void>;
  sadd(key: string, member: string): Promise<number>;
  sismember(key: string, member: string): Promise<boolean>;
  srem(key: string, member: string): Promise<number>;
  smembers(key: string): Promise<string[]>;
  isRateLimited(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
}

// ─── Local In-Memory Fallback Client ─────────────────────────────────
class InMemoryRedisClient implements IRedisClient {
  private cache = new Map<string, string>();
  private expiries = new Map<string, number>();
  private sets = new Map<string, Set<string>>();
  private slidingWindows = new Map<string, number[]>();

  constructor() {
    logger.info('[Redis] Initializing Local Bounded In-Memory Cache.');
    
    // Background task to sweep expired keys periodically to prevent memory leaks
    setInterval(() => {
      const now = Date.now();
      for (const [key, expireTime] of this.expiries.entries()) {
        if (now > expireTime) {
          this.cache.delete(key);
          this.expiries.delete(key);
          this.sets.delete(key);
          this.slidingWindows.delete(key);
        }
      }
    }, 10000).unref();
  }

  private isExpired(key: string): boolean {
    const expireTime = this.expiries.get(key);
    if (expireTime && Date.now() > expireTime) {
      this.cache.delete(key);
      this.expiries.delete(key);
      this.sets.delete(key);
      this.slidingWindows.delete(key);
      return true;
    }
    return false;
  }

  async get(key: string): Promise<string | null> {
    if (this.isExpired(key)) return null;
    return this.cache.get(key) || null;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.cache.set(key, value);
    if (ttlSeconds !== undefined) {
      this.expiries.set(key, Date.now() + ttlSeconds * 1000);
    } else {
      this.expiries.delete(key);
    }
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
    this.expiries.delete(key);
    this.sets.delete(key);
    this.slidingWindows.delete(key);
  }

  async incr(key: string): Promise<number> {
    if (this.isExpired(key)) {
      this.cache.set(key, '0');
    }
    const current = parseInt(this.cache.get(key) || '0', 10);
    const updated = current + 1;
    this.cache.set(key, String(updated));
    return updated;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    this.expiries.set(key, Date.now() + ttlSeconds * 1000);
  }

  async sadd(key: string, member: string): Promise<number> {
    if (this.isExpired(key)) {
      this.sets.delete(key);
    }
    if (!this.sets.has(key)) {
      this.sets.set(key, new Set());
    }
    const set = this.sets.get(key)!;
    if (set.has(member)) return 0;
    set.add(member);
    return 1;
  }

  async sismember(key: string, member: string): Promise<boolean> {
    if (this.isExpired(key)) return false;
    const set = this.sets.get(key);
    return set ? set.has(member) : false;
  }

  async srem(key: string, member: string): Promise<number> {
    if (this.isExpired(key)) return 0;
    const set = this.sets.get(key);
    if (set && set.has(member)) {
      set.delete(member);
      return 1;
    }
    return 0;
  }

  async smembers(key: string): Promise<string[]> {
    if (this.isExpired(key)) return [];
    const set = this.sets.get(key);
    return set ? Array.from(set) : [];
  }

  async isRateLimited(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!this.slidingWindows.has(key)) {
      this.slidingWindows.set(key, []);
    }

    let timestamps = this.slidingWindows.get(key)!;
    
    // Filter out timestamps outside window
    timestamps = timestamps.filter(t => t > windowStart);
    timestamps.push(now);
    
    this.slidingWindows.set(key, timestamps);
    this.expiries.set(key, now + windowMs);

    const currentCount = timestamps.length;
    const limited = currentCount > limit;

    return {
      limited,
      current: currentCount,
      resetTimeMs: now + windowMs,
    };
  }
}

// ─── Upstash Redis Implementation ────────────────────────────────────
class UpstashRedisClient implements IRedisClient {
  private client: Redis;
  private fallback: InMemoryRedisClient;

  constructor(url: string, token: string, fallback: InMemoryRedisClient) {
    this.client = new Redis({ url, token });
    this.fallback = fallback;
    logger.info('[Redis] Upstash Redis client initialized.');
  }

  async get(key: string): Promise<string | null> {
    try {
      const val = await this.client.get(key);
      return val === null ? null : typeof val === 'object' ? JSON.stringify(val) : String(val);
    } catch (err: any) {
      logger.warn(`[Redis] Upstash GET failed; falling back. error: ${err.message}`);
      return await this.fallback.get(key);
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds !== undefined) {
        await this.client.set(key, value, { ex: ttlSeconds });
      } else {
        await this.client.set(key, value);
      }
    } catch (err: any) {
      logger.warn(`[Redis] Upstash SET failed; falling back. error: ${err.message}`);
      await this.fallback.set(key, value, ttlSeconds);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err: any) {
      logger.warn(`[Redis] Upstash DEL failed; falling back. error: ${err.message}`);
      await this.fallback.del(key);
    }
  }

  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (err: any) {
      logger.warn(`[Redis] Upstash INCR failed; falling back. error: ${err.message}`);
      return await this.fallback.incr(key);
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      await this.client.expire(key, ttlSeconds);
    } catch (err: any) {
      logger.warn(`[Redis] Upstash EXPIRE failed; falling back. error: ${err.message}`);
      await this.fallback.expire(key, ttlSeconds);
    }
  }

  async sadd(key: string, member: string): Promise<number> {
    try {
      return await this.client.sadd(key, member);
    } catch (err: any) {
      logger.warn(`[Redis] Upstash SADD failed; falling back. error: ${err.message}`);
      return await this.fallback.sadd(key, member);
    }
  }

  async sismember(key: string, member: string): Promise<boolean> {
    try {
      const result = await this.client.sismember(key, member);
      return result === 1;
    } catch (err: any) {
      logger.warn(`[Redis] Upstash SISMEMBER failed; falling back. error: ${err.message}`);
      return await this.fallback.sismember(key, member);
    }
  }

  async srem(key: string, member: string): Promise<number> {
    try {
      return await this.client.srem(key, member);
    } catch (err: any) {
      logger.warn(`[Redis] Upstash SREM failed; falling back. error: ${err.message}`);
      return await this.fallback.srem(key, member);
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      return await this.client.smembers(key);
    } catch (err: any) {
      logger.warn(`[Redis] Upstash SMEMBERS failed; falling back. error: ${err.message}`);
      return await this.fallback.smembers(key);
    }
  }

  async isRateLimited(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    try {
      const now = Date.now();
      const windowStart = now - windowMs;
      const memberId = `${now}-${Math.random()}`;

      const pipeline = this.client.pipeline();
      pipeline.zadd(key, { score: now, member: memberId });
      pipeline.zremrangebyscore(key, 0, windowStart);
      pipeline.zcard(key);
      pipeline.expire(key, Math.ceil(windowMs / 1000));
      
      const results = await pipeline.exec();
      const currentCount = results[2] as number;
      const limited = currentCount > limit;
      const resetTimeMs = now + windowMs;

      return {
        limited,
        current: currentCount,
        resetTimeMs,
      };
    } catch (err: any) {
      logger.warn(`[Redis] Upstash rate limit pipeline check failed; falling back. error: ${err.message}`);
      return await this.fallback.isRateLimited(key, limit, windowMs);
    }
  }
}

// ─── Client Instantiation ────────────────────────────────────────────
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const inMemoryClient = new InMemoryRedisClient();

export const redisService: IRedisClient =
  redisUrl && redisToken
    ? new UpstashRedisClient(redisUrl, redisToken, inMemoryClient)
    : inMemoryClient;

export default redisService;
