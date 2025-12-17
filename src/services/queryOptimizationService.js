const pool = require('../config/database');

class QueryOptimizationService {
  
  /**
   * Optimized practice search with full-text search and proper indexing
   */
  static async searchPracticesOptimized(searchTerm, filters = {}, pagination = {}) {
    const { typeId, goalId, category } = filters;
    const { limit = 20, offset = 0 } = pagination;
    
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;
    
    // Full-text search on name and description
    if (searchTerm && searchTerm.trim()) {
      whereConditions.push(`(
        to_tsvector('english', p.name) @@ plainto_tsquery('english', $${paramIndex}) OR
        to_tsvector('english', p.description) @@ plainto_tsquery('english', $${paramIndex}) OR
        LOWER(p.name) LIKE LOWER($${paramIndex + 1}) OR
        LOWER(p.description) LIKE LOWER($${paramIndex + 1})
      )`);
      params.push(searchTerm.trim(), `%${searchTerm.trim()}%`);
      paramIndex += 2;
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
    
    // Category filter (assuming category is stored as tag)
    if (category) {
      whereConditions.push(`p.tagId = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }
    
    // Only published practices
    whereConditions.push(`pv.status = 'Published'`);
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT DISTINCT
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
      ORDER BY 
        CASE WHEN $${paramIndex} IS NOT NULL THEN
          ts_rank(to_tsvector('english', p.name || ' ' || p.description), plainto_tsquery('english', $${paramIndex}))
        ELSE 0 END DESC,
        p.name ASC
      LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
    `;
    
    params.push(searchTerm || null, limit, offset);
    
    const result = await pool.query(query, params);
    
    return {
      practices: result.rows,
      totalCount: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0
    };
  }
  
  /**
   * Optimized team affinity calculation with batch processing
   */
  static async calculateTeamAffinityBatch(teamId, practiceVersionIds) {
    if (!practiceVersionIds || practiceVersionIds.length === 0) {
      return {};
    }
    
    const query = `
      WITH team_members AS (
        SELECT p.id, p.name
        FROM Person p
        INNER JOIN teamMember tm ON p.id = tm.personId
        WHERE tm.teamId = $1
      ),
      member_affinities AS (
        SELECT 
          ppa.practiceVersionId,
          ppa.personId,
          tm.name as memberName,
          COALESCE(ppa.affinity, 0) as affinity
        FROM team_members tm
        LEFT JOIN personPracticeAffinity ppa ON tm.id = ppa.personId
        WHERE ppa.practiceVersionId = ANY($2) OR ppa.practiceVersionId IS NULL
      )
      SELECT 
        practiceVersionId,
        COUNT(personId) as memberCount,
        ROUND(AVG(affinity)) as averageAffinity,
        ROUND(STDDEV(affinity)) as affinityStdDev,
        COUNT(CASE WHEN affinity < 40 THEN 1 END) as lowAffinityCount,
        ARRAY_AGG(
          CASE WHEN affinity < 40 THEN 
            json_build_object('memberId', personId, 'memberName', memberName, 'affinity', affinity)
          END
        ) FILTER (WHERE affinity < 40) as lowAffinityMembers
      FROM member_affinities
      WHERE practiceVersionId IS NOT NULL
      GROUP BY practiceVersionId
    `;
    
    const result = await pool.query(query, [teamId, practiceVersionIds]);
    
    // Convert to object keyed by practiceVersionId
    const affinityMap = {};
    result.rows.forEach(row => {
      affinityMap[row.practiceversionid] = {
        averageAffinity: parseInt(row.averageaffinity) || 0,
        memberCount: parseInt(row.membercount),
        affinityStdDev: parseFloat(row.affinitystddev) || 0,
        lowAffinityCount: parseInt(row.lowaffinitycount),
        lowAffinityMembers: row.lowaffinitymembers || [],
        hasLowAffinity: parseInt(row.lowaffinitycount) > 0
      };
    });
    
    return affinityMap;
  }
  
  /**
   * Optimized practice details with all associations in single query
   */
  static async getPracticeDetailsOptimized(practiceId) {
    const query = `
      WITH practice_data AS (
        SELECT 
          p.id,
          p.name,
          p.objective,
          p.description,
          p.typeId,
          pt.name as typeName
        FROM Practice p
        LEFT JOIN practiceType pt ON p.typeId = pt.id
        WHERE p.id = $1
      ),
      practice_versions AS (
        SELECT 
          pv.id as versionId,
          pv.practiceId,
          pv.universeId,
          pv.versionName,
          pv.status,
          pv.lastUpdate,
          u.name as universeName
        FROM practiceVersion pv
        LEFT JOIN Universe u ON pv.universeId = u.id
        WHERE pv.practiceId = $1 AND pv.status = 'Published'
      ),
      practice_goals AS (
        SELECT 
          pg.practiceVersionId,
          json_agg(json_build_object('id', g.id, 'name', g.name, 'description', g.description)) as goals
        FROM practiceGoal pg
        INNER JOIN Goal g ON pg.goalId = g.id
        WHERE pg.practiceVersionId IN (SELECT versionId FROM practice_versions)
        GROUP BY pg.practiceVersionId
      ),
      practice_activities AS (
        SELECT 
          pva.practiceVersionId,
          json_agg(
            json_build_object(
              'id', a.id, 
              'name', a.name, 
              'description', a.description,
              'sequence', pva.sequence
            ) ORDER BY pva.sequence
          ) as activities
        FROM practiceVersionActivity pva
        INNER JOIN Activity a ON pva.activityId = a.id
        WHERE pva.practiceVersionId IN (SELECT versionId FROM practice_versions)
        GROUP BY pva.practiceVersionId
      ),
      practice_guidelines AS (
        SELECT 
          g.practiceVersionId,
          json_agg(json_build_object('id', g.id, 'name', g.name, 'content', g.content, 'typeId', g.typeId)) as guidelines
        FROM Guideline g
        WHERE g.practiceVersionId IN (SELECT versionId FROM practice_versions)
        GROUP BY g.practiceVersionId
      ),
      practice_benefits AS (
        SELECT 
          b.practiceVersionId,
          json_agg(json_build_object('id', b.id, 'name', b.name, 'description', b.description)) as benefits
        FROM Benefit b
        WHERE b.practiceVersionId IN (SELECT versionId FROM practice_versions)
        GROUP BY b.practiceVersionId
      ),
      practice_pitfalls AS (
        SELECT 
          p.practiceVersionId,
          json_agg(json_build_object('id', p.id, 'name', p.name, 'description', p.description)) as pitfalls
        FROM Pitfall p
        WHERE p.practiceVersionId IN (SELECT versionId FROM practice_versions)
        GROUP BY p.practiceVersionId
      )
      SELECT 
        pd.*,
        json_agg(
          json_build_object(
            'versionId', pv.versionId,
            'universeId', pv.universeId,
            'universeName', pv.universeName,
            'versionName', pv.versionName,
            'status', pv.status,
            'lastUpdate', pv.lastUpdate,
            'goals', COALESCE(pg.goals, '[]'::json),
            'activities', COALESCE(pa.activities, '[]'::json),
            'guidelines', COALESCE(pgl.guidelines, '[]'::json),
            'benefits', COALESCE(pb.benefits, '[]'::json),
            'pitfalls', COALESCE(pp.pitfalls, '[]'::json)
          )
        ) as versions
      FROM practice_data pd
      LEFT JOIN practice_versions pv ON pd.id = pv.practiceId
      LEFT JOIN practice_goals pg ON pv.versionId = pg.practiceVersionId
      LEFT JOIN practice_activities pa ON pv.versionId = pa.practiceVersionId
      LEFT JOIN practice_guidelines pgl ON pv.versionId = pgl.practiceVersionId
      LEFT JOIN practice_benefits pb ON pv.versionId = pb.practiceVersionId
      LEFT JOIN practice_pitfalls pp ON pv.versionId = pp.practiceVersionId
      GROUP BY pd.id, pd.name, pd.objective, pd.description, pd.typeId, pd.typeName
    `;
    
    const result = await pool.query(query, [practiceId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  }
  
  /**
   * Optimized dashboard query with all team data in single request
   */
  static async getTeamDashboardOptimized(teamId) {
    const query = `
      WITH team_info AS (
        SELECT t.id, t.name, t.description
        FROM Team t
        WHERE t.id = $1
      ),
      team_universes AS (
        SELECT u.id, u.name, u.description, u.teamId
        FROM Universe u
        WHERE u.teamId = $1
      ),
      active_practices AS (
        SELECT 
          pvu.universeId,
          pvu.practiceVersionId,
          p.id as practiceId,
          p.name as practiceName,
          p.description as practiceDescription,
          pv.versionName,
          pv.status
        FROM PracticeVersionUniverse pvu
        INNER JOIN practiceVersion pv ON pvu.practiceVersionId = pv.id
        INNER JOIN Practice p ON pv.practiceId = p.id
        WHERE pvu.universeId IN (SELECT id FROM team_universes)
          AND pvu.isActive = true
          AND pv.status = 'Published'
      ),
      practice_goals AS (
        SELECT 
          ap.practiceVersionId,
          json_agg(json_build_object('id', g.id, 'name', g.name)) as goals
        FROM active_practices ap
        INNER JOIN practiceGoal pg ON ap.practiceVersionId = pg.practiceVersionId
        INNER JOIN Goal g ON pg.goalId = g.id
        GROUP BY ap.practiceVersionId
      ),
      team_members AS (
        SELECT p.id, p.name
        FROM Person p
        INNER JOIN teamMember tm ON p.id = tm.personId
        WHERE tm.teamId = $1
      ),
      practice_affinities AS (
        SELECT 
          ap.practiceVersionId,
          COUNT(tm.id) as memberCount,
          ROUND(AVG(COALESCE(ppa.affinity, 0))) as avgAffinity,
          COUNT(CASE WHEN COALESCE(ppa.affinity, 0) < 40 THEN 1 END) as lowAffinityCount
        FROM active_practices ap
        CROSS JOIN team_members tm
        LEFT JOIN personPracticeAffinity ppa ON tm.id = ppa.personId AND ap.practiceVersionId = ppa.practiceVersionId
        GROUP BY ap.practiceVersionId
      )
      SELECT 
        ti.*,
        json_agg(DISTINCT tu.*) as universes,
        json_agg(
          DISTINCT json_build_object(
            'practiceVersionId', ap.practiceVersionId,
            'practiceId', ap.practiceId,
            'practiceName', ap.practiceName,
            'practiceDescription', ap.practiceDescription,
            'versionName', ap.versionName,
            'universeId', ap.universeId,
            'goals', COALESCE(pg.goals, '[]'::json),
            'teamAffinity', COALESCE(pa.avgAffinity, 0),
            'memberCount', COALESCE(pa.memberCount, 0),
            'lowAffinityCount', COALESCE(pa.lowAffinityCount, 0),
            'hasLowAffinity', COALESCE(pa.lowAffinityCount, 0) > 0
          )
        ) FILTER (WHERE ap.practiceVersionId IS NOT NULL) as activePractices
      FROM team_info ti
      LEFT JOIN team_universes tu ON ti.id = tu.teamId
      LEFT JOIN active_practices ap ON tu.id = ap.universeId
      LEFT JOIN practice_goals pg ON ap.practiceVersionId = pg.practiceVersionId
      LEFT JOIN practice_affinities pa ON ap.practiceVersionId = pa.practiceVersionId
      GROUP BY ti.id, ti.name, ti.description
    `;
    
    const result = await pool.query(query, [teamId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  }
  
  /**
   * Batch recommendation query for multiple practices
   */
  static async getRecommendationsBatch(practiceVersionIds, memberIds, contextId = null) {
    const query = `
      WITH target_practices AS (
        SELECT unnest($1::int[]) as practiceVersionId
      ),
      target_goals AS (
        SELECT DISTINCT pg.goalId, tp.practiceVersionId
        FROM target_practices tp
        INNER JOIN practiceGoal pg ON tp.practiceVersionId = pg.practiceVersionId
      ),
      alternative_practices AS (
        SELECT DISTINCT
          tg.practiceVersionId as originalPracticeId,
          pg.practiceVersionId as alternativePracticeId,
          p.name as alternativeName,
          p.description as alternativeDescription
        FROM target_goals tg
        INNER JOIN practiceGoal pg ON tg.goalId = pg.goalId
        INNER JOIN practiceVersion pv ON pg.practiceVersionId = pv.id
        INNER JOIN Practice p ON pv.practiceId = p.id
        WHERE pg.practiceVersionId != tg.practiceVersionId
          AND pv.status = 'Published'
      ),
      member_affinities AS (
        SELECT 
          ap.originalPracticeId,
          ap.alternativePracticeId,
          ap.alternativeName,
          ap.alternativeDescription,
          ROUND(AVG(COALESCE(ppa.affinity, 0))) as avgAffinity,
          COUNT(CASE WHEN COALESCE(ppa.affinity, 0) > 60 THEN 1 END) as highAffinityCount
        FROM alternative_practices ap
        CROSS JOIN unnest($2::int[]) as memberId
        LEFT JOIN personPracticeAffinity ppa ON memberId = ppa.personId AND ap.alternativePracticeId = ppa.practiceVersionId
        GROUP BY ap.originalPracticeId, ap.alternativePracticeId, ap.alternativeName, ap.alternativeDescription
      )
      SELECT 
        originalPracticeId,
        json_agg(
          json_build_object(
            'practiceVersionId', alternativePracticeId,
            'name', alternativeName,
            'description', alternativeDescription,
            'teamAffinity', avgAffinity,
            'highAffinityCount', highAffinityCount
          ) ORDER BY avgAffinity DESC
        ) as alternatives
      FROM member_affinities
      WHERE avgAffinity > 50  -- Only recommend practices with decent affinity
      GROUP BY originalPracticeId
    `;
    
    const result = await pool.query(query, [practiceVersionIds, memberIds]);
    
    // Convert to object keyed by original practice ID
    const recommendationsMap = {};
    result.rows.forEach(row => {
      recommendationsMap[row.originalpracticeid] = row.alternatives || [];
    });
    
    return recommendationsMap;
  }
  
  /**
   * Get query execution statistics for monitoring
   */
  static async getQueryStats() {
    const query = `
      SELECT 
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation
      FROM pg_stats 
      WHERE schemaname = 'public' 
        AND tablename IN ('practice', 'practiceversion', 'personpracticeaffinity', 'teammember')
      ORDER BY tablename, attname
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }
}

module.exports = QueryOptimizationService;