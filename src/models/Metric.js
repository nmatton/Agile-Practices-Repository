const pool = require('../config/database');

class Metric {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.unit = data.unit;
    this.scale = data.scale;
    this.formula = data.formula;
    this.lastUpdate = data.lastupdate || data.lastUpdate;
    this.lastUpdateById = data.lastupdatebyid || data.lastUpdateById;
  }

  static async create({ name, unit, scale, formula, lastUpdateById }) {
    if (!name || !lastUpdateById) {
      throw new Error('Name and last update by ID are required');
    }

    try {
      const result = await pool.query(
        `INSERT INTO Metric (name, unit, scale, formula, lastUpdate, lastUpdateById) 
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5) 
         RETURNING id, name, unit, scale, formula, lastUpdate, lastUpdateById`,
        [name, unit || null, scale || null, formula || null, lastUpdateById]
      );

      return new Metric(result.rows[0]);
    } catch (error) {
      if (error.code === '23503') { // Foreign key constraint violation
        throw new Error('Invalid user ID');
      }
      throw error;
    }
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM Metric WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new Metric(result.rows[0]);
  }

  static async findAll({ limit = 50, offset = 0 } = {}) {
    const result = await pool.query(
      'SELECT * FROM Metric ORDER BY name LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result.rows.map(row => new Metric(row));
  }

  async update({ name, unit, scale, formula, lastUpdateById }) {
    const result = await pool.query(
      `UPDATE Metric 
       SET name = COALESCE($1, name), 
           unit = COALESCE($2, unit),
           scale = COALESCE($3, scale),
           formula = COALESCE($4, formula),
           lastUpdate = CURRENT_TIMESTAMP,
           lastUpdateById = COALESCE($5, lastUpdateById)
       WHERE id = $6
       RETURNING id, name, unit, scale, formula, lastUpdate, lastUpdateById`,
      [name, unit, scale, formula, lastUpdateById, this.id]
    );

    if (result.rows.length === 0) {
      throw new Error('Metric not found');
    }

    const updated = new Metric(result.rows[0]);
    Object.assign(this, updated);
    return this;
  }

  async delete() {
    const result = await pool.query(
      'DELETE FROM Metric WHERE id = $1',
      [this.id]
    );

    return result.rowCount > 0;
  }

  async linkToPracticeVersions(practiceVersionIds) {
    if (!Array.isArray(practiceVersionIds) || practiceVersionIds.length === 0) {
      return;
    }

    // First, remove existing links
    await pool.query(
      'DELETE FROM metricPractice WHERE metricId = $1',
      [this.id]
    );

    // Then add new links
    const values = practiceVersionIds.map((practiceVersionId, index) => 
      `($1, $${index + 2})`
    ).join(', ');

    const query = `INSERT INTO metricPractice (metricId, practiceVersionId) VALUES ${values}`;
    await pool.query(query, [this.id, ...practiceVersionIds]);
  }

  async getPracticeVersions() {
    const result = await pool.query(
      `SELECT pv.*, p.name as practiceName FROM practiceVersion pv
       JOIN Practice p ON pv.practiceId = p.id
       JOIN metricPractice mp ON pv.id = mp.practiceVersionId
       WHERE mp.metricId = $1
       ORDER BY p.name, pv.versionName`,
      [this.id]
    );
    return result.rows;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      unit: this.unit,
      scale: this.scale,
      formula: this.formula,
      lastUpdate: this.lastUpdate,
      lastUpdateById: this.lastUpdateById
    };
  }
}

module.exports = Metric;