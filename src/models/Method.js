const pool = require('../config/database');

class Method {
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
      throw new Error('Method name is required');
    }

    try {
      const result = await pool.query(
        `INSERT INTO Method (name, objective, description, typeId) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, name, objective, description, typeId`,
        [name, objective || null, description || null, typeId || null]
      );

      return new Method(result.rows[0]);
    } catch (error) {
      if (error.code === '23503') { // Foreign key constraint violation
        throw new Error('Invalid method type');
      }
      throw error;
    }
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM Method WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new Method(result.rows[0]);
  }

  static async findByName(name) {
    const result = await pool.query(
      'SELECT * FROM Method WHERE name = $1',
      [name]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new Method(result.rows[0]);
  }

  static async findAll({ typeId, limit = 50, offset = 0 } = {}) {
    let query = 'SELECT * FROM Method';
    const params = [];
    
    if (typeId) {
      query += ' WHERE typeId = $1';
      params.push(typeId);
    }
    
    query += ' ORDER BY name LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows.map(row => new Method(row));
  }

  async update({ name, objective, description, typeId }) {
    const result = await pool.query(
      `UPDATE Method 
       SET name = COALESCE($1, name), 
           objective = COALESCE($2, objective),
           description = COALESCE($3, description),
           typeId = COALESCE($4, typeId)
       WHERE id = $5
       RETURNING id, name, objective, description, typeId`,
      [name, objective, description, typeId, this.id]
    );

    if (result.rows.length === 0) {
      throw new Error('Method not found');
    }

    const updated = new Method(result.rows[0]);
    Object.assign(this, updated);
    return this;
  }

  async delete() {
    const result = await pool.query(
      'DELETE FROM Method WHERE id = $1',
      [this.id]
    );

    return result.rowCount > 0;
  }

  async getVersions() {
    const result = await pool.query(
      `SELECT mv.*, u.name as universeName, u.teamId
       FROM methodVersion mv
       JOIN Universe u ON mv.universeId = u.id
       WHERE mv.methodId = $1
       ORDER BY mv.versionTimestamp DESC`,
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
        `INSERT INTO methodVersion (methodId, universeId, versionName, changeDescription, lastUpdate, lastUpdateById) 
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5) 
         RETURNING id, methodId, universeId, versionName, versionTimestamp, changeDescription, lastUpdate, lastUpdateById`,
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

module.exports = Method;