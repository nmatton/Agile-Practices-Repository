const pool = require('../config/database');

class Activity {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.lastUpdate = data.lastupdate || data.lastUpdate;
    this.lastUpdateById = data.lastupdatebyid || data.lastUpdateById;
  }

  static async create({ name, description, lastUpdateById }) {
    // Validate input
    if (!name || !lastUpdateById) {
      throw new Error('Activity name and last update by ID are required');
    }

    try {
      const result = await pool.query(
        `INSERT INTO Activity (name, description, lastUpdate, lastUpdateById) 
         VALUES ($1, $2, CURRENT_TIMESTAMP, $3) 
         RETURNING id, name, description, lastUpdate, lastUpdateById`,
        [name, description || null, lastUpdateById]
      );

      return new Activity(result.rows[0]);
    } catch (error) {
      if (error.code === '23503') { // Foreign key constraint violation
        throw new Error('Invalid user ID');
      }
      throw error;
    }
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM Activity WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new Activity(result.rows[0]);
  }

  static async findByName(name) {
    const result = await pool.query(
      'SELECT * FROM Activity WHERE name = $1',
      [name]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new Activity(result.rows[0]);
  }

  static async findAll({ limit = 50, offset = 0 } = {}) {
    const result = await pool.query(
      'SELECT * FROM Activity ORDER BY name LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    return result.rows.map(row => new Activity(row));
  }

  async update({ name, description, lastUpdateById }) {
    const result = await pool.query(
      `UPDATE Activity 
       SET name = COALESCE($1, name), 
           description = COALESCE($2, description),
           lastUpdate = CURRENT_TIMESTAMP,
           lastUpdateById = COALESCE($3, lastUpdateById)
       WHERE id = $4
       RETURNING id, name, description, lastUpdate, lastUpdateById`,
      [name, description, lastUpdateById, this.id]
    );

    if (result.rows.length === 0) {
      throw new Error('Activity not found');
    }

    const updated = new Activity(result.rows[0]);
    Object.assign(this, updated);
    return this;
  }

  async delete() {
    const result = await pool.query(
      'DELETE FROM Activity WHERE id = $1',
      [this.id]
    );

    return result.rowCount > 0;
  }

  async getPracticeVersions() {
    const result = await pool.query(
      `SELECT pv.*, pva.sequence, p.name as practiceName
       FROM practiceVersion pv
       JOIN practiceVersionActivity pva ON pv.id = pva.practiceVersionId
       JOIN Practice p ON pv.practiceId = p.id
       WHERE pva.activityId = $1
       ORDER BY p.name, pv.versionName`,
      [this.id]
    );

    return result.rows;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      lastUpdate: this.lastUpdate,
      lastUpdateById: this.lastUpdateById
    };
  }
}

module.exports = Activity;