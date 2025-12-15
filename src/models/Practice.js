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