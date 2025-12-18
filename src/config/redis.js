const redis = require('redis');
require('dotenv').config();

let redisClient;

// In test environment, use a mock Redis client
if (process.env.NODE_ENV === 'test') {
  // Mock Redis client for testing
  redisClient = {
    connect: () => Promise.resolve(),
    quit: () => Promise.resolve(),
    ping: () => Promise.resolve('PONG'),
    get: () => Promise.resolve(null),
    set: () => Promise.resolve('OK'),
    del: () => Promise.resolve(1),
    exists: () => Promise.resolve(0),
    expire: () => Promise.resolve(1),
    on: () => {},
    off: () => {}
  };
} else {
  redisClient = redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: process.env.REDIS_DB || 0,
  });

  redisClient.on('connect', () => {
    console.log('Connected to Redis server');
  });

  redisClient.on('error', (err) => {
    console.error('Redis connection error:', err);
  });

  // Connect to Redis
  redisClient.connect().catch(console.error);
}

module.exports = redisClient;