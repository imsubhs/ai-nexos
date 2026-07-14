export interface PortalCacheStrategy {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  invalidate(key: string): Promise<void>;
}

export class PortalCache {
  private strategy: PortalCacheStrategy;

  constructor(strategy: PortalCacheStrategy) {
    this.strategy = strategy;
  }

  async getDashboardData<T>(clientId: string): Promise<T | null> {
    return this.strategy.get<T>(`portal:dashboard:${clientId}`);
  }

  async setDashboardData<T>(clientId: string, data: T, ttlSeconds = 300): Promise<void> {
    await this.strategy.set(`portal:dashboard:${clientId}`, data, ttlSeconds);
  }
  
  async invalidateDashboard(clientId: string): Promise<void> {
    await this.strategy.invalidate(`portal:dashboard:${clientId}`);
  }
}

export class InMemoryPortalCacheStrategy implements PortalCacheStrategy {
  private cache = new Map<string, { value: unknown, expiresAt: number }>();

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlSeconds * 1000)
    });
  }

  async invalidate(key: string): Promise<void> {
    this.cache.delete(key);
  }
}

export class RedisPortalCacheStrategy implements PortalCacheStrategy {
  // Usually implemented with ioredis or @upstash/redis
  
  constructor() {
    if (!process.env.REDIS_URL && process.env.NODE_ENV !== 'test') {
      console.warn("Redis URL not provided. RedisPortalCacheStrategy is mock-only.");
    }
  }

  async get<T>(_key: string): Promise<T | null> {
    // const data = await redis.get(_key);
    // return data ? JSON.parse(data) : null;
    return null;
  }

  async set<T>(_key: string, _value: T, _ttlSeconds: number = 300): Promise<void> {
    // await redis.set(_key, JSON.stringify(_value), 'EX', _ttlSeconds);
  }

  async invalidate(_key: string): Promise<void> {
    // await redis.del(_key);
  }
}
