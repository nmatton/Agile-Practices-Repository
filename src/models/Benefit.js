const pool = require('../config/database');

class Benefit {
  constructor(data) {
    this.id = data.id;
    this.practiceVersionId = data.practiceversionid || data.practiceVersionId;
    this.name = data.name;
    this.description = data.description;
    this.content = data.content;
    this.lastUpdate = data.lastupdate || data.lastUpdate;
    this.lastUpdateById = data.lastupdatebyid || data.lastUpdateById;
  }

  static async create({ practiceVersionId, name, description, content, lastUpdateById }) {
    if (!practiceVersionId || !name || !lastUpdateById) {
      throw new Error('Practice version ID, name, and last update by ID are required');
    }

    try {
      const result = await pool.query(
        `INSERT INTO Benefit (practiceVersionId, name, description, content, lastUpdate, lastUpdateById) 
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5) 
         RETURNING id, practiceVersionId, name, description, content, lastUpdate, lastUpdateById`,
        [practiceVersionId, name, description || null, content || null, lastUpdateById]
      );

      return new Benefit(result.rows[0]);
    } catch (error) {
      if (error.code === '23503') { // Foreign key constraint violation
        throw new Error('Invalid practice version ID or user ID');
      }
      throw error;
    }
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM Benefit WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new Benefit(result.rows[0]);
  }

  static async findByPracticeVersionId(practiceVersionId) {
    const result = await pool.query(
      'SELECT * FROM Benefit WHERE practiceVersionId = $1 ORDER BY name',
      [practiceVersionId]
    );
    return result.rows.map(row => new Benefit(row));
  }

  static async findAll({ practiceVersionId, limit = 50, offset = 0 } = {}) {
    let query = 'SELECT * FROM Benefit';
    const params = [];
    
    if (practiceVersionId) {
      query += ' WHERE practiceVersionId = $1';
      params.push(practiceVersionId);
    }
    
    query += ' ORDER BY name LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows.map(row => new Benefit(row));
  }

  async update({ name, description, content, lastUpdateById }) {
    const result = await pool.query(
      `UPDATE Benefit 
       SET name = COALESCE($1, name), 
           description = COALESCE($2, description),
           content = COALESCE($3, content),
           lastUpdate = CURRENT_TIMESTAMP,
           lastUpdateById = COALESCE($4, lastUpdateById)
       WHERE id = $5
       RETURNING id, practiceVersionId, name, description, content, lastUpdate, lastUpdateById`,
      [name, description, content, lastUpdateById, this.id]
    );

    if (result.rows.length === 0) {
      throw new Error('Benefit not found');
    }

    const updated = new Benefit(result.rows[0]);
    Object.assign(this, updated);
    return this;
  }

  async delete() {
    const result = await pool.query(
      'DELETE FROM Benefit WHERE id = $1',
      [this.id]
    );

    return result.rowCount > 0;
  }

  toJSON() {
    return {
      id: this.id,
      practiceVersionId: this.practiceVersionId,
      name: this.name,
      description: this.description,
      content: this.content,
      lastUpdate: this.lastUpdate,
      lastUpdateById: this.lastUpdateById
    };
  }
}

module.exports = Benefit;