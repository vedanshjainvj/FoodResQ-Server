const redis = require('../config/redis.config');

/**
 * Get all Redis keys matching a pattern
 * @param {string} pattern - Key pattern to match (e.g., 'food:*')
 * @returns {Promise<Array>} - List of matching keys
 */
const getKeys = async (pattern = '*') => {
  try {
    return await redis.keys(pattern);
  } catch (error) {
    console.error('Error getting Redis keys:', error);
    return [];
  }
};

/**
 * Clear all Redis keys matching a pattern
 * @param {string} pattern - Key pattern to match (e.g., 'food:*')
 * @returns {Promise<number>} - Number of keys deleted
 */
const flushKeys = async (pattern = '*') => {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      return await redis.del(keys);
    }
    return 0;
  } catch (error) {
    console.error('Error flushing Redis keys:', error);
    return 0;
  }
};

/**
 * Get cache statistics
 * @returns {Promise<Object>} - Cache statistics
 */
const getCacheStats = async () => {
  try {
    const info = await redis.info();
    const stats = {};
    
    // Parse Redis INFO command output
    info.split('\n').forEach(line => {
      const parts = line.split(':');
      if (parts.length >= 2) {
        stats[parts[0]] = parts[1];
      }
    });
    
    // Get total number of keys in the database
    const dbKeys = await redis.dbsize();
    
    // Get counts of different key types
    const foodListKeys = await getKeys('food:list:*');
    const foodDetailKeys = await getKeys('food:detail:*');
    
    return {
      totalKeys: dbKeys,
      foodListCacheCount: foodListKeys.length,
      foodDetailCacheCount: foodDetailKeys.length,
      uptime: stats.uptime_in_seconds,
      usedMemory: stats.used_memory_human,
      connectedClients: stats.connected_clients
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return {
      error: 'Failed to retrieve cache statistics'
    };
  }
};

module.exports = {
  getKeys,
  flushKeys,
  getCacheStats
}; 