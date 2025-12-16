const pool = require('../config/database');

class Recommendation {
  constructor(data) {
    this.id = data.id;
    this.practiceVersionId = data.practiceversionid || data.practiceVersionId;
    this.contextId = data.contextid || data.contextId;
    this.description = data.description;
    this.typeId = data.typeid || data.typeId;
    this.statusId = data.statusid || data.statusId;
    this.lastUpdate = data.lastupdate || data.lastUpdate;
    this.lastUpdateById = data.lastupdatebyid || data.lastUpdateById;
  }

  static async create({ practiceVersionId, contextId, description, typeId, statusId, lastUpdateById }) {
    if (!practiceVersionId || !description || !lastUpdateById) {
      throw new Error('Practice version ID, description, and last update by ID are required');
    }

    try {
      const result = await pool.query(
        `INSERT INTO Recommendation (practiceVersionId, contextId, description, typeId, statusId, lastUpdate, lastUpdateById) 
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6) 
         RETURNING id, practiceVersionId, contextId, description, typeId, statusId, lastUpdate, lastUpdateById`,
        [practiceVersionId, contextId || null, description, typeId || null, statusId || null, lastUpdateById]
      );

      return new Recommendation(result.rows[0]);
    } catch (error) {
      if (error.code === '23503') { // Foreign key constraint violation
        throw new Error('Invalid practice version ID, context ID, type ID, status ID, or user ID');
      }
      throw error;
    }
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM Recommendation WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new Recommendation(result.rows[0]);
  }

  static async findByPracticeVersionId(practiceVersionId) {
    const result = await pool.query(
      'SELECT * FROM Recommendation WHERE practiceVersionId = $1 ORDER BY id',
      [practiceVersionId]
    );
    return result.rows.map(row => new Recommendation(row));
  }

  static async findByContextId(contextId) {
    const result = await pool.query(
      'SELECT * FROM Recommendation WHERE contextId = $1 ORDER BY id',
      [contextId]
    );
    return result.rows.map(row => new Recommendation(row));
  }

  static async findAll({ practiceVersionId, contextId, typeId, statusId, limit = 50, offset = 0 } = {}) {
    let query = 'SELECT * FROM Recommendation';
    const params = [];
    const conditions = [];
    
    if (practiceVersionId) {
      conditions.push('practiceVersionId = $' + (params.length + 1));
      params.push(practiceVersionId);
    }
    
    if (contextId) {
      conditions.push('contextId = $' + (params.length + 1));
      params.push(contextId);
    }
    
    if (typeId) {
      conditions.push('typeId = $' + (params.length + 1));
      params.push(typeId);
    }
    
    if (statusId) {
      conditions.push('statusId = $' + (params.length + 1));
      params.push(statusId);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY id LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows.map(row => new Recommendation(row));
  }

  async update({ description, typeId, statusId, contextId, lastUpdateById }) {
    const result = await pool.query(
      `UPDATE Recommendation 
       SET description = COALESCE($1, description), 
           typeId = COALESCE($2, typeId),
           statusId = COALESCE($3, statusId),
           contextId = COALESCE($4, contextId),
           lastUpdate = CURRENT_TIMESTAMP,
           lastUpdateById = COALESCE($5, lastUpdateById)
       WHERE id = $6
       RETURNING id, practiceVersionId, contextId, description, typeId, statusId, lastUpdate, lastUpdateById`,
      [description, typeId, statusId, contextId, lastUpdateById, this.id]
    );

    if (result.rows.length === 0) {
      throw new Error('Recommendation not found');
    }

    const updated = new Recommendation(result.rows[0]);
    Object.assign(this, updated);
    return this;
  }

  async delete() {
    const result = await pool.query(
      'DELETE FROM Recommendation WHERE id = $1',
      [this.id]
    );

    return result.rowCount > 0;
  }

  async linkToGoals(goalIds) {
    if (!Array.isArray(goalIds) || goalIds.length === 0) {
      return;
    }

    // First, remove existing links
    await pool.query(
      'DELETE FROM recommendationGoal WHERE recommendationId = $1',
      [this.id]
    );

    // Then add new links
    const values = goalIds.map((goalId, index) => 
      `($1, $${index + 2})`
    ).join(', ');

    const query = `INSERT INTO recommendationGoal (recommendationId, goalId) VALUES ${values}`;
    await pool.query(query, [this.id, ...goalIds]);
  }

  async getGoals() {
    const result = await pool.query(
      `SELECT g.* FROM Goal g
       JOIN recommendationGoal rg ON g.id = rg.goalId
       WHERE rg.recommendationId = $1
       ORDER BY g.name`,
      [this.id]
    );
    return result.rows;
  }

  toJSON() {
    return {
      id: this.id,
      practiceVersionId: this.practiceVersionId,
      contextId: this.contextId,
      description: this.description,
      typeId: this.typeId,
      statusId: this.statusId,
      lastUpdate: this.lastUpdate,
      lastUpdateById: this.lastUpdateById
    };
  }
}

module.exports = Recommendation;