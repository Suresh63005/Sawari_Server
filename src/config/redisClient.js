
const connectRedis = require('./connectRedis');

let redisClientInstance = null; // Declares a singleton instance to prevent multiple Redis connections.

const getClient = async () => {
  // Lazy-loads the Redis client (only connects once).
  // Useful for reusability in routes, services, etc.
  if (!redisClientInstance) {
    redisClientInstance = await connectRedis();
  }
  return redisClientInstance;
};

module.exports = { getClient };
