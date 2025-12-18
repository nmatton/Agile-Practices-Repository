const pool = require('../config/database');

class QueryOptimizationService {
  
  /**
   * Simple practice search with basic filtering
   */
  static async searchPracticesOptimized(searchTerm, filters = {}, pagination = {}) {
    const { typeId, goalId, category } = filters;
    const { limit = 20, offset = 0 } = pagination;
    
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;
    
    // Simple text search on name and description
    if (searchTerm && searchTerm.trim()) {
      whereConditions.push(`(
        LOWER(p.name) LIKE LOWER($${paramIndex}) OR
        LOWER(p.description) LIKE LOWER($${paramIndex})
      )`);
      params.push(`%${searchTerm.trim()}%`);
      paramIndex++;
    }
    
    // Type filter
    if (typeId) {
      whereConditions.push(`p.typeId = $${paramIndex}`);
      params.push(typeId);
      paramIndex++;
    }
    
    // Goal filter (requires join with practice-goal association)
    if (goalId) {
      whereConditions.push(`EXISTS (
        SELECT 1 FROM practiceGoal pg 
        WHERE pg.practiceVersionId = pv.id AND pg.goalId = $${paramIndex}
      )`);
      params.push(goalId);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT
        p.id,
        p.name,
        p.objective,
        p.description,
        p.typeId,
        pv.id as versionId,
        pv.versionName,
        pv.lastUpdate,
        COUNT(*) OVER() as total_count
      FROM Practice p
      INNER JOIN practiceVersion pv ON p.id = pv.practiceId
      ${whereClause}
      ORDER BY p.name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    return {
      practices: result.rows,
      totalCount: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0
    };
  }
  
  /**
   * Simple team affinity calculation
   */
  static async calculateTeamAffinityBatch(teamId, practiceVersionIds) {
    if (!practiceVersionIds || practiceVersionIds.length === 0) {
      return {};
    }
    
    const query = `
      SELECT 
        ppa.practiceVersionId,
        COUNT(ppa.personId) as memberCount,
        ROUND(AVG(COALESCE(ppa.affinity, 0))) as averageAffinity,
        COUNT(CASE WHEN COALESCE(ppa.affinity, 0) < 40 THEN 1 END) as lowAffinityCount
      FROM teammember tm
      LEFT JOIN personpracticeaffinity ppa ON tm.personId = ppa.personId
      WHERE tm.teamId = $1 
        AND (ppa.practiceVersionId = ANY($2) OR ppa.practiceVersionId IS NULL)
      GROUP BY ppa.practiceVersionId
      HAVING ppa.practiceVersionId IS NOT NULL
    `;
    
    const result = await pool.query(query, [teamId, practiceVersionIds]);
    
    // Convert to object keyed by practiceVersionId
    const affinityMap = {};
    result.rows.forEach(row => {
      affinityMap[row.practiceversionid] = {
        averageAffinity: parseInt(row.averageaffinity) || 0,
        memberCount: parseInt(row.membercount),
        lowAffinityCount: parseInt(row.lowaffinitycount),
        hasLowAffinity: parseInt(row.lowaffinitycount) > 0
      };
    });
    
    return affinityMap;
  }
  
  /**
   * Simple practice details query
   */
  static async getPracticeDetailsOptimized(practiceId) {
    const query = `
      SELECT 
        p.id,
        p.name,
        p.objective,
        p.description,
        p.typeId,
        pv.id as versionId,
        pv.versionName,
        pv.lastUpdate
      FROM Practice p
      LEFT JOIN practiceVersion pv ON p.id = pv.practiceId
      WHERE p.id = $1
      LIMIT 1
    `;
    
    const result = await pool.query(query, [practiceId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  }
  
  /**
   * Simple team dashboard query
   */
  static async getTeamDashboardOptimized(teamId) {
    const query = `
      SELECT 
        t.id,
        t.name,
        t.description
      FROM Team t
      WHERE t.id = $1
    `;
    
    const result = await pool.query(query, [teamId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  }
  
  /**
   * Simple recommendations query
   */
  static async getRecommendationsBatch(practiceVersionIds, memberIds, contextId = null) {
    // Return empty recommendations for now
    const recommendationsMap = {};
    practiceVersionIds.forEach(id => {
      recommendationsMap[id] = [];
    });
    
    return recommendationsMap;
  }
  
  /**
   * Get basic query statistics
   */
  static async getQueryStats() {
    const query = `
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }
}

module.exports = QueryOptimizationService;