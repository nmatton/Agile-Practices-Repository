const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const cacheService = require('../services/cacheService');
const QueryOptimizationService = require('../services/queryOptimizationService');
const { requireAuth } = require('../middleware/auth');

// GET /api/performance/stats - Get performance statistics (admin only)
router.get('/stats', requireAuth, async (req, res) => {
  try {
    // Check if user has admin role (assuming roleId 1 is admin)
    if (req.user.roleId !== 1) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    // Get database statistics
    const dbStatsQuery = `
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_tuples,
        n_dead_tup as dead_tuples,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
      ORDER BY n_live_tup DESC
    `;
    
    const dbStats = await pool.query(dbStatsQuery);
    
    // Get index usage statistics
    const indexStatsQuery = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_tup_read,
        idx_tup_fetch,
        idx_scan
      FROM pg_stat_user_indexes 
      WHERE schemaname = 'public'
      ORDER BY idx_scan DESC
    `;
    
    const indexStats = await pool.query(indexStatsQuery);
    
    // Get slow queries (if pg_stat_statements is enabled)
    let slowQueries = [];
    try {
      const slowQueriesQuery = `
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows
        FROM pg_stat_statements 
        WHERE query NOT LIKE '%pg_stat%'
        ORDER BY mean_time DESC 
        LIMIT 10
      `;
      const slowQueriesResult = await pool.query(slowQueriesQuery);
      slowQueries = slowQueriesResult.rows;
    } catch (error) {
      // pg_stat_statements extension might not be enabled
      console.log('pg_stat_statements not available');
    }
    
    // Get cache statistics
    const cacheStats = await cacheService.getStats();
    
    // Get query optimization statistics
    const queryStats = await QueryOptimizationService.getQueryStats();
    
    // Get connection pool statistics
    const poolStats = {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    };
    
    res.json({
      success: true,
      data: {
        database: {
          tables: dbStats.rows,
          indexes: indexStats.rows,
          slowQueries: slowQueries,
          connectionPool: poolStats
        },
        cache: cacheStats,
        queryOptimization: queryStats,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error fetching performance stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance statistics',
      error: error.message
    });
  }
});

// POST /api/performance/cache/clear - Clear all caches (admin only)
router.post('/cache/clear', requireAuth, async (req, res) => {
  try {
    // Check if user has admin role
    if (req.user.roleId !== 1) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const deletedCount = await cacheService.clearAll();
    
    res.json({
      success: true,
      message: `Cleared ${deletedCount} cache entries`,
      data: {
        deletedCount,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache',
      error: error.message
    });
  }
});

// POST /api/performance/cache/invalidate - Invalidate specific cache patterns (admin only)
router.post('/cache/invalidate', requireAuth, async (req, res) => {
  try {
    // Check if user has admin role
    if (req.user.roleId !== 1) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { pattern } = req.body;
    
    if (!pattern) {
      return res.status(400).json({
        success: false,
        message: 'Cache pattern is required'
      });
    }
    
    const deletedCount = await cacheService.delPattern(`apr:${pattern}`);
    
    res.json({
      success: true,
      message: `Invalidated ${deletedCount} cache entries matching pattern: ${pattern}`,
      data: {
        pattern,
        deletedCount,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error invalidating cache:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to invalidate cache',
      error: error.message
    });
  }
});

// GET /api/performance/health - Health check with performance metrics
router.get('/health', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Test database connection
    const dbTest = await pool.query('SELECT 1 as test');
    const dbResponseTime = Date.now() - startTime;
    
    // Test Redis connection
    const redisStartTime = Date.now();
    await cacheService.get('health-check');
    const redisResponseTime = Date.now() - redisStartTime;
    
    // Get basic stats
    const cacheStats = await cacheService.getStats();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: dbTest.rows.length > 0,
        responseTime: `${dbResponseTime}ms`
      },
      cache: {
        connected: cacheStats.connected,
        responseTime: `${redisResponseTime}ms`,
        keyCount: cacheStats.keyCount
      },
      performance: {
        totalResponseTime: `${Date.now() - startTime}ms`
      }
    };
    
    res.json(health);
    
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// GET /api/performance/metrics - Get key performance metrics
router.get('/metrics', requireAuth, async (req, res) => {
  try {
    const { timeframe = '1h' } = req.query;
    
    // Get practice access patterns
    const practiceMetricsQuery = `
      SELECT 
        COUNT(*) as total_practices,
        COUNT(CASE WHEN pv.status = 'Published' THEN 1 END) as published_practices,
        COUNT(CASE WHEN pv.status = 'Draft' THEN 1 END) as draft_practices
      FROM Practice p
      LEFT JOIN practiceVersion pv ON p.id = pv.practiceId
    `;
    
    const practiceMetrics = await pool.query(practiceMetricsQuery);
    
    // Get team activity metrics
    const teamMetricsQuery = `
      SELECT 
        COUNT(DISTINCT t.id) as total_teams,
        COUNT(DISTINCT tm.personId) as total_team_members,
        AVG(team_sizes.member_count) as avg_team_size
      FROM Team t
      LEFT JOIN teamMember tm ON t.id = tm.teamId
      LEFT JOIN (
        SELECT teamId, COUNT(*) as member_count
        FROM teamMember
        GROUP BY teamId
      ) team_sizes ON t.id = team_sizes.teamId
    `;
    
    const teamMetrics = await pool.query(teamMetricsQuery);
    
    // Get affinity calculation metrics
    const affinityMetricsQuery = `
      SELECT 
        COUNT(*) as total_affinities,
        AVG(affinity) as avg_affinity,
        COUNT(CASE WHEN affinity < 40 THEN 1 END) as low_affinity_count,
        COUNT(CASE WHEN affinity >= 70 THEN 1 END) as high_affinity_count
      FROM personPracticeAffinity
    `;
    
    const affinityMetrics = await pool.query(affinityMetricsQuery);
    
    res.json({
      success: true,
      data: {
        practices: practiceMetrics.rows[0],
        teams: teamMetrics.rows[0],
        affinities: affinityMetrics.rows[0],
        timeframe,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance metrics',
      error: error.message
    });
  }
});

module.exports = router;