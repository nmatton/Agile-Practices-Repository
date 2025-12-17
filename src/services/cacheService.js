const redisClient = require('../config/redis');

class CacheService {
  constructor() {
    this.defaultTTL = 3600; // 1 hour default TTL
    this.affinityTTL = 7200; // 2 hours for affinity calculations
    this.practiceDetailsTTL = 1800; // 30 minutes for practice details
    this.teamDataTTL = 900; // 15 minutes for team data
  }

  /**
   * Generate cache key with consistent naming convention
   */
  generateKey(prefix, ...parts) {
    return `apr:${prefix}:${parts.join(':')}`;
  }

  /**
   * Get cached data
   */
  async get(key) {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached data with TTL
   */
  async set(key, data, ttl = this.defaultTTL) {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete cached data
   */
  async del(key) {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async delPattern(pattern) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return keys.length;
    } catch (error) {
      console.error('Cache pattern delete error:', error);
      return 0;
    }
  }

  /**
   * Cache practice details with dependencies
   */
  async cachePracticeDetails(practiceId, data) {
    const key = this.generateKey('practice', 'details', practiceId);
    return await this.set(key, data, this.practiceDetailsTTL);
  }

  /**
   * Get cached practice details
   */
  async getCachedPracticeDetails(practiceId) {
    const key = this.generateKey('practice', 'details', practiceId);
    return await this.get(key);
  }

  /**
   * Cache team affinity calculation
   */
  async cacheTeamAffinity(teamId, practiceVersionId, affinityData) {
    const key = this.generateKey('affinity', 'team', teamId, practiceVersionId);
    return await this.set(key, affinityData, this.affinityTTL);
  }

  /**
   * Get cached team affinity
   */
  async getCachedTeamAffinity(teamId, practiceVersionId) {
    const key = this.generateKey('affinity', 'team', teamId, practiceVersionId);
    return await this.get(key);
  }

  /**
   * Cache individual person affinity
   */
  async cachePersonAffinity(personId, practiceVersionId, affinity) {
    const key = this.generateKey('affinity', 'person', personId, practiceVersionId);
    return await this.set(key, affinity, this.affinityTTL);
  }

  /**
   * Get cached person affinity
   */
  async getCachedPersonAffinity(personId, practiceVersionId) {
    const key = this.generateKey('affinity', 'person', personId, practiceVersionId);
    return await this.get(key);
  }

  /**
   * Cache team dashboard data
   */
  async cacheTeamDashboard(teamId, dashboardData) {
    const key = this.generateKey('dashboard', 'team', teamId);
    return await this.set(key, dashboardData, this.teamDataTTL);
  }

  /**
   * Get cached team dashboard
   */
  async getCachedTeamDashboard(teamId) {
    const key = this.generateKey('dashboard', 'team', teamId);
    return await this.get(key);
  }

  /**
   * Cache practice search results
   */
  async cachePracticeSearch(searchParams, results) {
    const searchKey = this.generateSearchKey(searchParams);
    const key = this.generateKey('search', 'practices', searchKey);
    return await this.set(key, results, 600); // 10 minutes for search results
  }

  /**
   * Get cached practice search results
   */
  async getCachedPracticeSearch(searchParams) {
    const searchKey = this.generateSearchKey(searchParams);
    const key = this.generateKey('search', 'practices', searchKey);
    return await this.get(key);
  }

  /**
   * Cache recommendations
   */
  async cacheRecommendations(memberIds, contextId, goalIds, recommendations) {
    const recKey = this.generateRecommendationKey(memberIds, contextId, goalIds);
    const key = this.generateKey('recommendations', recKey);
    return await this.set(key, recommendations, this.affinityTTL);
  }

  /**
   * Get cached recommendations
   */
  async getCachedRecommendations(memberIds, contextId, goalIds) {
    const recKey = this.generateRecommendationKey(memberIds, contextId, goalIds);
    const key = this.generateKey('recommendations', recKey);
    return await this.get(key);
  }

  /**
   * Invalidate caches when data changes
   */
  async invalidatePracticeCache(practiceId) {
    const patterns = [
      this.generateKey('practice', 'details', practiceId),
      this.generateKey('search', 'practices', '*'),
      this.generateKey('recommendations', '*')
    ];
    
    let deletedCount = 0;
    for (const pattern of patterns) {
      deletedCount += await this.delPattern(pattern);
    }
    
    return deletedCount;
  }

  /**
   * Invalidate team-related caches
   */
  async invalidateTeamCache(teamId) {
    const patterns = [
      this.generateKey('dashboard', 'team', teamId),
      this.generateKey('affinity', 'team', teamId, '*'),
      this.generateKey('recommendations', '*')
    ];
    
    let deletedCount = 0;
    for (const pattern of patterns) {
      deletedCount += await this.delPattern(pattern);
    }
    
    return deletedCount;
  }

  /**
   * Invalidate person affinity caches
   */
  async invalidatePersonAffinityCache(personId) {
    const patterns = [
      this.generateKey('affinity', 'person', personId, '*'),
      this.generateKey('affinity', 'team', '*', '*'), // Team affinities depend on person affinities
      this.generateKey('recommendations', '*')
    ];
    
    let deletedCount = 0;
    for (const pattern of patterns) {
      deletedCount += await this.delPattern(pattern);
    }
    
    return deletedCount;
  }

  /**
   * Generate consistent search key from parameters
   */
  generateSearchKey(params) {
    const { typeId, goalId, search, category, limit, offset } = params;
    return [
      typeId || 'all',
      goalId || 'all', 
      search ? Buffer.from(search).toString('base64').substring(0, 20) : 'none',
      category || 'all',
      limit || 20,
      offset || 0
    ].join('_');
  }

  /**
   * Generate consistent recommendation key
   */
  generateRecommendationKey(memberIds, contextId, goalIds) {
    const sortedMembers = Array.isArray(memberIds) ? memberIds.sort().join(',') : memberIds;
    const sortedGoals = Array.isArray(goalIds) ? goalIds.sort().join(',') : (goalIds || 'none');
    return [
      sortedMembers,
      contextId || 'none',
      sortedGoals
    ].join('_');
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      const info = await redisClient.info('memory');
      const keyCount = await redisClient.dbSize();
      
      return {
        keyCount,
        memoryInfo: info,
        connected: redisClient.isReady
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        keyCount: 0,
        memoryInfo: 'Error retrieving memory info',
        connected: false
      };
    }
  }

  /**
   * Clear all APR caches
   */
  async clearAll() {
    try {
      const deletedCount = await this.delPattern('apr:*');
      return deletedCount;
    } catch (error) {
      console.error('Cache clear all error:', error);
      return 0;
    }
  }
}

module.exports = new CacheService();