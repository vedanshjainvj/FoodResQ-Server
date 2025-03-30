const redis = require('../config/redis.config');

// Default cache expiration time in seconds (1 hour)
const DEFAULT_EXPIRATION = 3600;

/**
 * Get data from Redis cache
 * @param {string} key - Cache key
 * @returns {Promise<Object|null>} - Cached data or null if not found
 */
const getCache = async (key) => {
  try {
    const cachedData = await redis.get(key);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    return null;
  } catch (error) {
    console.error('Redis get error:', error);
    return null; // Return null in case of error to continue app flow
  }
};

/**
 * Set data in Redis cache
 * @param {string} key - Cache key
 * @param {Object} data - Data to cache
 * @param {number} expiration - Expiration time in seconds (optional)
 */
const setCache = async (key, data, expiration = DEFAULT_EXPIRATION) => {
  try {
    await redis.set(key, JSON.stringify(data), 'EX', expiration);
  } catch (error) {
    console.error('Redis set error:', error);
    // Continue app flow even if caching fails
  }
};

/**
 * Delete a specific cache entry
 * @param {string} key - Cache key to delete
 */
const deleteCache = async (key) => {
  try {
    await redis.del(key);
  } catch (error) {
    console.error('Redis delete error:', error);
  }
};

/**
 * Delete multiple cache entries by pattern
 * @param {string} pattern - Pattern to match keys (e.g., 'food:*')
 */
const deleteCacheByPattern = async (pattern) => {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(keys);
    }
  } catch (error) {
    console.error('Redis delete by pattern error:', error);
  }
};

/**
 * Generate food list cache key based on query parameters
 * @param {Object} queryParams - Query parameters
 * @returns {string} - Cache key
 */
const generateFoodListCacheKey = (queryParams) => {
  const sortedParams = Object.keys(queryParams).sort().reduce((acc, key) => {
    acc[key] = queryParams[key];
    return acc;
  }, {});
  
  return `food:list:${JSON.stringify(sortedParams)}`;
};

/**
 * Generate food detail cache key
 * @param {string} foodId - Food ID
 * @returns {string} - Cache key
 */
const generateFoodDetailCacheKey = (foodId) => {
  return `food:detail:${foodId}`;
};

module.exports = {
  getCache,
  setCache,
  deleteCache,
  deleteCacheByPattern,
  generateFoodListCacheKey,
  generateFoodDetailCacheKey,
  DEFAULT_EXPIRATION
}; 