const pool = require('../config/database');

class ContextIndicator {
  constructor(data) {
    this.id = data.id;
    this.contextId = data.contextid || data.contextId;
    this.name = data.name;
    this.description = data.description;
    this.attributes = data.attributes;
    this.precision = data.precision;
    this.value = data.value;
  }

  static async create({ contextId, name, description, attributes, precision, value }) {
    if (!contextId || !name) {
      throw new Error('Context ID and name are required');
    }

    try {
      const result = await pool.query(
        `INSERT INTO contextIndicator (contextId, name, description, attributes, precision, value) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id, contextId, name, description, attributes, precision, value`,
        [contextId, name, description || null, attributes || null, precision || null, value || null]
      );

      return new ContextIndicator(result.rows[0]);
    } catch (error) {
      if (error.code === '23503') { // Foreign key constraint violation
        throw new Error('Invalid context ID');
      }
      throw error;
    }
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM contextIndicator WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new ContextIndicator(result.rows[0]);
  }

  static async findByContextId(contextId) {
    const result = await pool.query(
      'SELECT * FROM contextIndicator WHERE contextId = $1 ORDER BY name',
      [contextId]
    );
    return result.rows.map(row => new ContextIndicator(row));
  }

  static async findAll({ contextId, limit = 50, offset = 0 } = {}) {
    let query = 'SELECT * FROM contextIndicator';
    const params = [];
    
    if (contextId) {
      query += ' WHERE contextId = $1';
      params.push(contextId);
    }
    
    query += ' ORDER BY name LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows.map(row => new ContextIndicator(row));
  }

  async update({ name, description, attributes, precision, value }) {
    const result = await pool.query(
      `UPDATE contextIndicator 
       SET name = COALESCE($1, name), 
           description = COALESCE($2, description),
           attributes = COALESCE($3, attributes),
           precision = COALESCE($4, precision),
           value = COALESCE($5, value)
       WHERE id = $6
       RETURNING id, contextId, name, description, attributes, precision, value`,
      [name, description, attributes, precision, value, this.id]
    );

    if (result.rows.length === 0) {
      throw new Error('Context indicator not found');
    }

    const updated = new ContextIndicator(result.rows[0]);
    Object.assign(this, updated);
    return this;
  }

  async delete() {
    const result = await pool.query(
      'DELETE FROM contextIndicator WHERE id = $1',
      [this.id]
    );

    return result.rowCount > 0;
  }

  toJSON() {
    return {
      id: this.id,
      contextId: this.contextId,
      name: this.name,
      description: this.description,
      attributes: this.attributes,
      precision: this.precision,
      value: this.value
    };
  }
}

module.exports = ContextIndicator;