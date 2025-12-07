/**
 * Fake Redis Client with Azure Redis Cache compatible APIs
 * Replace with actual ioredis/redis client for production
 */

type ExpiryEntry = { timeoutId: NodeJS.Timeout; expiresAt: number };

class FakeRedisClient {
	private store: Map<string, string> = new Map();
	private hashStore: Map<string, Map<string, string>> = new Map();
	private expiries: Map<string, ExpiryEntry> = new Map();

	// Basic string operations
	async get(key: string): Promise<string | null> {
		const v = this.store.get(key);
		return v ?? null;
	}

	async set(key: string, value: string, mode?: string | null, durationSeconds?: number | null): Promise<'OK'> {
		this.clearExpiry(key);
		this.store.set(key, value);

		if (mode === 'EX' && typeof durationSeconds === 'number' && durationSeconds > 0) {
			this.setExpiry(key, durationSeconds);
		}
		return 'OK';
	}

	// Azure Redis compatible: SET with EX in one call
	async setex(key: string, seconds: number, value: string): Promise<'OK'> {
		return this.set(key, value, 'EX', seconds);
	}

	async del(...keys: string[]): Promise<number> {
		let count = 0;
		for (const key of keys) {
			if (this.store.delete(key)) count++;
			this.clearExpiry(key);
			this.hashStore.delete(key);
		}
		return count;
	}

	// Multiple get
	async mget(...keys: string[]): Promise<(string | null)[]> {
		return keys.map(k => this.store.get(k) ?? null);
	}

	// Multiple set
	async mset(...pairs: string[]): Promise<'OK'> {
		for (let i = 0; i < pairs.length; i += 2) {
			const key = pairs[i];
			const val = pairs[i + 1];
			if (key !== undefined && val !== undefined) {
				this.store.set(key, val);
			}
		}
		return 'OK';
	}

	// Check existence
	async exists(...keys: string[]): Promise<number> {
		return keys.filter(k => this.store.has(k) || this.hashStore.has(k)).length;
	}

	// Pattern matching keys (simplified - only supports prefix*)
	async keys(pattern: string): Promise<string[]> {
		const prefix = pattern.replace(/\*$/, '');
		const results: string[] = [];
		for (const key of this.store.keys()) {
			if (key.startsWith(prefix)) results.push(key);
		}
		for (const key of this.hashStore.keys()) {
			if (key.startsWith(prefix) && !results.includes(key)) results.push(key);
		}
		return results;
	}

	// TTL operations
	async ttl(key: string): Promise<number> {
		const entry = this.expiries.get(key);
		if (!entry) return -1;
		const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000);
		return remaining > 0 ? remaining : -2;
	}

	async expire(key: string, seconds: number): Promise<number> {
		if (!this.store.has(key) && !this.hashStore.has(key)) return 0;
		this.clearExpiry(key);
		this.setExpiry(key, seconds);
		return 1;
	}

	// Hash operations for structured data
	async hset(key: string, field: string, value: string): Promise<number> {
		let hash = this.hashStore.get(key);
		if (!hash) {
			hash = new Map();
			this.hashStore.set(key, hash);
		}
		const isNew = !hash.has(field);
		hash.set(field, value);
		return isNew ? 1 : 0;
	}

	async hget(key: string, field: string): Promise<string | null> {
		return this.hashStore.get(key)?.get(field) ?? null;
	}

	async hgetall(key: string): Promise<Record<string, string>> {
		const hash = this.hashStore.get(key);
		if (!hash) return {};
		const result: Record<string, string> = {};
		for (const [k, v] of hash) result[k] = v;
		return result;
	}

	async hdel(key: string, ...fields: string[]): Promise<number> {
		const hash = this.hashStore.get(key);
		if (!hash) return 0;
		let count = 0;
		for (const f of fields) {
			if (hash.delete(f)) count++;
		}
		return count;
	}

	async flushAll(): Promise<'OK'> {
		for (const [, e] of this.expiries) clearTimeout(e.timeoutId);
		this.expiries.clear();
		this.store.clear();
		this.hashStore.clear();
		return 'OK';
	}

	// Internal helpers
	private clearExpiry(key: string): void {
		const prev = this.expiries.get(key);
		if (prev) {
			clearTimeout(prev.timeoutId);
			this.expiries.delete(key);
		}
	}

	private setExpiry(key: string, seconds: number): void {
		const timeoutId = setTimeout(() => {
			this.store.delete(key);
			this.hashStore.delete(key);
			this.expiries.delete(key);
		}, seconds * 1000);
		this.expiries.set(key, { timeoutId, expiresAt: Date.now() + seconds * 1000 });
	}
}

export const redisClient = new FakeRedisClient();

export default redisClient;
