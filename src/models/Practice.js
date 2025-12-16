const pool = require('../config/database');

class Practice {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.objective = data.objective;
    this.description = data.description;
    this.typeId = data.typeid || data.typeId;
  }

  static async create({ name, objective, description, typeId }) {
    // Validate input
    if (!name) {
      throw new Error('Practice name is required');
    }

    try {
      const result = await pool.query(
        `INSERT INTO Practice (name, objective, description, typeId) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, name, objective, description, typeId`,
        [name, objective || null, description || null, typeId || null]
      );

      return new Practice(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Practice name already exists');
      }
      if (error.code === '23503') { // Foreign key constraint violation
        throw new Error('Invalid practice type');
      }
      throw error;
    }
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM Practice WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new Practice(result.rows[0]);
  }

  static async findByName(name) {
    const result = await pool.query(
      'SELECT * FROM Practice WHERE name = $1',
      [name]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new Practice(result.rows[0]);
  }

  static async findAll({ typeId, limit = 50, offset = 0 } = {}) {
    let query = 'SELECT * FROM Practice';
    const params = [];
    
    if (typeId) {
      query += ' WHERE typeId = $1';
      params.push(typeId);
    }
    
    query += ' ORDER BY name LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows.map(row => new Practice(row));
  }

  static async findAllWithFilters({ typeId, goalId, search, category, limit = 50, offset = 0 } = {}) {
    let query = `
      SELECT DISTINCT p.*, pt.name as typeName
      FROM Practice p
      LEFT JOIN practiceType pt ON p.typeId = pt.id
    `;
    
    const conditions = [];
    const params = [];
    let paramCount = 0;

    // Filter by type
    if (typeId) {
      paramCount++;
      conditions.push(`p.typeId = $${paramCount}`);
      params.push(typeId);
    }

    // Filter by goal (through recommendations)
    if (goalId) {
      query += `
        LEFT JOIN practiceVersion pv ON p.id = pv.practiceId
        LEFT JOIN Recommendation r ON pv.id = r.practiceVersionId
        LEFT JOIN recommendationGoal rg ON r.id = rg.recommendationId
      `;
      paramCount++;
      conditions.push(`rg.goalId = $${paramCount}`);
      params.push(goalId);
    }

    // Search in name and description
    if (search) {
      paramCount++;
      conditions.push(`(LOWER(p.name) LIKE LOWER($${paramCount}) OR LOWER(p.description) LIKE LOWER($${paramCount}))`);
      params.push(`%${search}%`);
    }

    // Filter by category (using typeId as category for now)
    if (category) {
      paramCount++;
      conditions.push(`pt.name = $${paramCount}`);
      params.push(category);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY p.name LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows.map(row => {
      const practice = new Practice(row);
      practice.typeName = row.typename;
      return practice;
    });
  }

  static async search(searchTerm, { limit = 50, offset = 0 } = {}) {
    const query = `
      SELECT p.*, pt.name as typeName
      FROM Practice p
      LEFT JOIN practiceType pt ON p.typeId = pt.id
      WHERE LOWER(p.name) LIKE LOWER($1) OR LOWER(p.description) LIKE LOWER($1)
      ORDER BY 
        CASE 
          WHEN LOWER(p.name) LIKE LOWER($2) THEN 1
          WHEN LOWER(p.name) LIKE LOWER($1) THEN 2
          ELSE 3
        END,
        p.name
      LIMIT $3 OFFSET $4
    `;
    
    const exactMatch = `%${searchTerm}%`;
    const startsWith = `${searchTerm}%`;
    
    const result = await pool.query(query, [exactMatch, startsWith, limit, offset]);
    return result.rows.map(row => {
      const practice = new Practice(row);
      practice.typeName = row.typename;
      return practice;
    });
  }

  static async getByCategories() {
    const query = `
      SELECT 
        pt.id as categoryId,
        pt.name as categoryName,
        pt.description as categoryDescription,
        COUNT(p.id) as practiceCount,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', p.id,
            'name', p.name,
            'description', p.description,
            'objective', p.objective
          ) ORDER BY p.name
        ) as practices
      FROM practiceType pt
      LEFT JOIN Practice p ON pt.id = p.typeId
      GROUP BY pt.id, pt.name, pt.description
      ORDER BY pt.name
    `;
    
    const result = await pool.query(query);
    return result.rows.map(row => ({
      categoryId: row.categoryid,
      categoryName: row.categoryname,
      categoryDescription: row.categorydescription,
      practiceCount: parseInt(row.practicecount),
      practices: row.practices.filter(p => p.id !== null) // Remove null practices
    }));
  }

  async update({ name, objective, description, typeId }) {
    const result = await pool.query(
      `UPDATE Practice 
       SET name = COALESCE($1, name), 
           objective = COALESCE($2, objective),
           description = COALESCE($3, description),
           typeId = COALESCE($4, typeId)
       WHERE id = $5
       RETURNING id, name, objective, description, typeId`,
      [name, objective, description, typeId, this.id]
    );

    if (result.rows.length === 0) {
      throw new Error('Practice not found');
    }

    const updated = new Practice(result.rows[0]);
    Object.assign(this, updated);
    return this;
  }

  async delete() {
    const result = await pool.query(
      'DELETE FROM Practice WHERE id = $1',
      [this.id]
    );

    return result.rowCount > 0;
  }

  async getVersions() {
    const result = await pool.query(
      `SELECT pv.*, u.name as universeName, u.teamId
       FROM practiceVersion pv
       JOIN Universe u ON pv.universeId = u.id
       WHERE pv.practiceId = $1
       ORDER BY pv.versionTimestamp DESC`,
      [this.id]
    );

    return result.rows;
  }

  async createVersion({ universeId, versionName, changeDescription, lastUpdateById }) {
    if (!universeId || !versionName || !lastUpdateById) {
      throw new Error('Universe ID, version name, and last update by ID are required');
    }

    try {
      const result = await pool.query(
        `INSERT INTO practiceVersion (practiceId, universeId, versionName, changeDescription, lastUpdate, lastUpdateById) 
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5) 
         RETURNING id, practiceId, universeId, versionName, versionTimestamp, changeDescription, lastUpdate, lastUpdateById`,
        [this.id, universeId, versionName, changeDescription || null, lastUpdateById]
      );

      return result.rows[0];
    } catch (error) {
      if (error.code === '23503') { // Foreign key constraint violation
        throw new Error('Invalid universe ID or user ID');
      }
      throw error;
    }
  }

  async getCompleteDetails() {
    // Get basic practice information with type
    const practiceQuery = `
      SELECT p.*, pt.name as typeName, pt.description as typeDescription
      FROM Practice p
      LEFT JOIN practiceType pt ON p.typeId = pt.id
      WHERE p.id = $1
    `;
    
    const practiceResult = await pool.query(practiceQuery, [this.id]);
    const practiceData = practiceResult.rows[0];

    // Get all versions for this practice
    const versions = await this.getVersions();

    // Get associated information from the latest published version (if any)
    let associatedData = {
      guidelines: [],
      benefits: [],
      pitfalls: [],
      activities: [],
      roles: [],
      workproducts: [],
      metrics: [],
      recommendations: [],
      goals: []
    };

    if (versions.length > 0) {
      const latestVersionId = versions[0].id;

      // Get Guidelines
      const guidelinesResult = await pool.query(
        `SELECT g.*, gt.name as typeName 
         FROM Guideline g 
         LEFT JOIN guidelineType gt ON g.typeId = gt.id
         WHERE g.practiceVersionId = $1 
         ORDER BY g.name`,
        [latestVersionId]
      );
      associatedData.guidelines = guidelinesResult.rows;

      // Get Benefits
      const benefitsResult = await pool.query(
        'SELECT * FROM Benefit WHERE practiceVersionId = $1 ORDER BY name',
        [latestVersionId]
      );
      associatedData.benefits = benefitsResult.rows;

      // Get Pitfalls
      const pitfallsResult = await pool.query(
        'SELECT * FROM Pitfall WHERE practiceVersionId = $1 ORDER BY name',
        [latestVersionId]
      );
      associatedData.pitfalls = pitfallsResult.rows;

      // Get Activities (ordered by sequence)
      const activitiesResult = await pool.query(
        `SELECT a.*, pva.sequence
         FROM Activity a
         JOIN practiceVersionActivity pva ON a.id = pva.activityId
         WHERE pva.practiceVersionId = $1
         ORDER BY pva.sequence`,
        [latestVersionId]
      );
      associatedData.activities = activitiesResult.rows;

      // Get Roles
      const rolesResult = await pool.query(
        `SELECT r.*, ru.typeId as useTypeId, rut.name as useTypeName
         FROM Role r
         JOIN roleUse ru ON r.id = ru.roleId
         LEFT JOIN roleUseType rut ON ru.typeId = rut.id
         WHERE ru.practiceVersionId = $1
         ORDER BY r.name`,
        [latestVersionId]
      );
      associatedData.roles = rolesResult.rows;

      // Get Workproducts
      const workproductsResult = await pool.query(
        `SELECT w.*
         FROM Workproduct w
         JOIN workproductPractice wp ON w.id = wp.workproductId
         WHERE wp.practiceVersionId = $1
         ORDER BY w.name`,
        [latestVersionId]
      );
      associatedData.workproducts = workproductsResult.rows;

      // Get Metrics
      const metricsResult = await pool.query(
        `SELECT m.*
         FROM Metric m
         JOIN metricPractice mp ON m.id = mp.metricId
         WHERE mp.practiceVersionId = $1
         ORDER BY m.name`,
        [latestVersionId]
      );
      associatedData.metrics = metricsResult.rows;

      // Get Recommendations and their Goals
      const recommendationsResult = await pool.query(
        `SELECT r.*, rt.name as typeName, rs.name as statusName,
                c.description as contextDescription,
                COALESCE(
                  JSON_AGG(
                    JSON_BUILD_OBJECT('id', g.id, 'name', g.name, 'description', g.description)
                  ) FILTER (WHERE g.id IS NOT NULL), 
                  '[]'
                ) as goals
         FROM Recommendation r
         LEFT JOIN recommendationType rt ON r.typeId = rt.id
         LEFT JOIN recommendationStatus rs ON r.statusId = rs.id
         LEFT JOIN Context c ON r.contextId = c.id
         LEFT JOIN recommendationGoal rg ON r.id = rg.recommendationId
         LEFT JOIN Goal g ON rg.goalId = g.id
         WHERE r.practiceVersionId = $1
         GROUP BY r.id, rt.name, rs.name, c.description
         ORDER BY r.id`,
        [latestVersionId]
      );
      associatedData.recommendations = recommendationsResult.rows;

      // Extract unique goals from recommendations
      const goalSet = new Set();
      recommendationsResult.rows.forEach(rec => {
        if (rec.goals && Array.isArray(rec.goals)) {
          rec.goals.forEach(goal => {
            if (goal.id) {
              goalSet.add(JSON.stringify(goal));
            }
          });
        }
      });
      associatedData.goals = Array.from(goalSet).map(goalStr => JSON.parse(goalStr));
    }

    return {
      ...practiceData,
      typeName: practiceData.typename,
      typeDescription: practiceData.typedescription,
      versions,
      ...associatedData
    };
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      objective: this.objective,
      description: this.description,
      typeId: this.typeId
    };
  }
}

module.exports = Practice;