const Redis = require('ioredis');

// Configuration defaults
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

/**
 * Establishes a connection to Redis using ioredis with retry logic and event monitoring.
 * @returns {Redis} The connected ioredis client.
 * @throws {Error} If REDIS_URL is missing or connection fails after retries.
 */
const connectRedis = async () => {
  if (!process.env.REDIS_URL) {
    console.error('❌ REDIS_URL is missing');
    process.exit(1);
  }
  console.log("redis url is",process.env.REDIS_URL)

  //Create Redis Client:
  const client = new Redis(process.env.REDIS_URL, { // Initializes a Redis client using the given URL.
    maxRetriesPerRequest: null, // Allow unlimited retries for individual requests
    retryStrategy: (times) => {
      // Custom retry strategy for initial connection
      if (times > MAX_RETRIES) {
        return null; // Stop retrying after max attempts
      }
      return RETRY_DELAY_MS;
    },
  });

  client.on('connect', () => {
    console.info('✅ Redis connected');
  });

  client.on('error', (err) => {
    console.error(`❌ Redis connection error: ${err.message}`);
  });

  client.on('close', () => {
    console.warn('⚠️ Redis disconnected');
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    try {
      await client.quit();
      console.info('🔌 Redis connection closed due to app termination');
    } catch (err) {
      console.error(`❌ Error closing Redis connection: ${err.message}`);
    }
  });

  // Wait for the client to be ready
  await new Promise((resolve, reject) => {
    client.on('ready', () => resolve());
    client.on('error', (err) => {
      if (client.status === 'connecting') {
        reject(err); // Reject only during initial connection
      }
    });
  });

  return client;
};

module.exports = connectRedis;