const pool = require('../config/database');

class Context {
  constructor(data) {
    this.id = data.id;
    this.description = data.description;
  }

  static async create({ description }) {
    if (!description) {
      throw new Error('Context description is required');
    }

    try {
      const result = await pool.query(
        `INSERT INTO Context (description) 
         VALUES ($1) 
         RETURNING id, description`,
        [description]
      );

      return new Context(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM Context WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new Context(result.rows[0]);
  }

  static async findAll({ limit = 50, offset = 0 } = {}) {
    const result = await pool.query(
      'SELECT * FROM Context ORDER BY description LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result.rows.map(row => new Context(row));
  }

  async update({ description }) {
    const result = await pool.query(
      `UPDATE Context 
       SET description = COALESCE($1, description)
       WHERE id = $2
       RETURNING id, description`,
      [description, this.id]
    );

    if (result.rows.length === 0) {
      throw new Error('Context not found');
    }

    const updated = new Context(result.rows[0]);
    Object.assign(this, updated);
    return this;
  }

  async delete() {
    const result = await pool.query(
      'DELETE FROM Context WHERE id = $1',
      [this.id]
    );

    return result.rowCount > 0;
  }

  async getIndicators() {
    const result = await pool.query(
      'SELECT * FROM contextIndicator WHERE contextId = $1 ORDER BY name',
      [this.id]
    );
    return result.rows;
  }

  toJSON() {
    return {
      id: this.id,
      description: this.description
    };
  }
}

module.exports = Context;