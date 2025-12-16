const pool = require('../config/database');

class Goal {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
  }

  static async create({ name, description }) {
    if (!name) {
      throw new Error('Goal name is required');
    }

    try {
      const result = await pool.query(
        `INSERT INTO Goal (name, description) 
         VALUES ($1, $2) 
         RETURNING id, name, description`,
        [name, description || null]
      );

      return new Goal(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM Goal WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new Goal(result.rows[0]);
  }

  static async findAll({ limit = 50, offset = 0 } = {}) {
    const result = await pool.query(
      'SELECT * FROM Goal ORDER BY name LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result.rows.map(row => new Goal(row));
  }

  async update({ name, description }) {
    const result = await pool.query(
      `UPDATE Goal 
       SET name = COALESCE($1, name), 
           description = COALESCE($2, description)
       WHERE id = $3
       RETURNING id, name, description`,
      [name, description, this.id]
    );

    if (result.rows.length === 0) {
      throw new Error('Goal not found');
    }

    const updated = new Goal(result.rows[0]);
    Object.assign(this, updated);
    return this;
  }

  async delete() {
    const result = await pool.query(
      'DELETE FROM Goal WHERE id = $1',
      [this.id]
    );

    return result.rowCount > 0;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description
    };
  }
}

module.exports = Goal;