const crypto = require("crypto");

// A wrapper utility class around Redis to handle caching, key generation, and invalidation logic.
class CacheManager {
  // Takes the Redis client during initialization and verifies its connection.
  constructor(redisClient) {
    this.redisClient = redisClient;
    this.checkConnection();
  }

  async checkConnection() {
    try {
      await this.redisClient.ping(); // Sends a PING command to check Redis is alive.
      console.log("✅ Redis connection is active.");
    } catch (error) {
      console.error("❌ Redis connection failed:", error.message);
      throw new Error("Redis client is not connected");
    }
  }

  //Generate a Hash Key for Caching
  generateCacheKey(prefix, params) {
    const str = typeof params === "object" && params !== null
      ? JSON.stringify(params)
      : String(params);
    const key = `${prefix}:${crypto.createHash("md5").update(str).digest("hex")}`;
    console.log(`🔑 Generated cache key: ${key}`);
    return key;
  }

  //Read from Redis:
  async getCache(key) {
    try {
      const cached = await this.redisClient.get(key);
      console.log(`ℹ️ Redis GET key: ${key} -`, cached ? "✅ Found" : "❌ Not found");
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error(`❌ Error getting cache for key ${key}:`, error.message);
      return null;
    }
  }

  // Write to Redis:
  async setCache(key, data, expireSeconds = 60) {
    try {
      await this.redisClient.set(key, JSON.stringify(data), "EX", expireSeconds);
      console.log(`✅ Redis SET key: ${key} (expires in ${expireSeconds}s)`);
      return true;
    } catch (error) {
      console.error(`❌ Error setting cache for key ${key}:`, error.message);
      throw error;
    }
  }

  // Invalidate (Delete) Cache:
  async invalidateCache(keyOrPrefix) {
    console.log(`🧹 Invalidate request for key/pattern: ${keyOrPrefix}`);
    if (keyOrPrefix.includes("*")) {
      return this.invalidatePattern(keyOrPrefix);
    }

    try {
      const result = await this.redisClient.del(keyOrPrefix);
      console.log(`🗑️ CacheManager: Invalidated key: ${keyOrPrefix} (${result > 0 ? "success" : "not found"})`);
    } catch (error) {
      console.error(`❌ Error invalidating cache key ${keyOrPrefix}:`, error.message);
    }
  }

  // Invalidate Using Pattern:
  async invalidatePattern(pattern) {
    try {

      const stream = this.redisClient.scanStream({ match: pattern }); // Uses SCAN (non-blocking) to find keys matching a pattern (e.g., banners:*hash*).

      const keys = [];

      return new Promise((resolve, reject) => {
        stream.on("data", (resultKeys) => { // Collects all matching keys.
          if (Array.isArray(resultKeys) && resultKeys.length) {
            console.log(`📦 Found keys: ${resultKeys.join(", ")}`);
            keys.push(...resultKeys);
          }
        });

        stream.on("end", async () => { //Once scan is complete, deletes all matched keys in one go.
          if (keys.length > 0) {
            await this.redisClient.del(...keys);
            console.log(`🧹 CacheManager: Invalidated ${keys.length} keys for pattern: ${pattern}`);
          } else {
            console.log(`ℹ️ CacheManager: No keys matched pattern: ${pattern}`);
          }
          resolve();
        });

        stream.on("error", (err) => {
          console.error("❌ Redis scanStream error:", err);
          reject(err);
        });
      });
    } catch (error) {
      console.error(`❌ Error scanning pattern ${pattern}:`, error.message);
      throw error;
    }
  }
}

module.exports = CacheManager;
