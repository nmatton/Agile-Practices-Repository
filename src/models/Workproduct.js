const pool = require('../config/database');

class Workproduct {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.lastUpdate = data.lastupdate || data.lastUpdate;
    this.lastUpdateById = data.lastupdatebyid || data.lastUpdateById;
  }

  static async create({ name, description, lastUpdateById }) {
    if (!name || !lastUpdateById) {
      throw new Error('Name and last update by ID are required');
    }

    try {
      const result = await pool.query(
        `INSERT INTO Workproduct (name, description, lastUpdate, lastUpdateById) 
         VALUES ($1, $2, CURRENT_TIMESTAMP, $3) 
         RETURNING id, name, description, lastUpdate, lastUpdateById`,
        [name, description || null, lastUpdateById]
      );

      return new Workproduct(result.rows[0]);
    } catch (error) {
      if (error.code === '23503') { // Foreign key constraint violation
        throw new Error('Invalid user ID');
      }
      throw error;
    }
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM Workproduct WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new Workproduct(result.rows[0]);
  }

  static async findAll({ limit = 50, offset = 0 } = {}) {
    const result = await pool.query(
      'SELECT * FROM Workproduct ORDER BY name LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result.rows.map(row => new Workproduct(row));
  }

  async update({ name, description, lastUpdateById }) {
    const result = await pool.query(
      `UPDATE Workproduct 
       SET name = COALESCE($1, name), 
           description = COALESCE($2, description),
           lastUpdate = CURRENT_TIMESTAMP,
           lastUpdateById = COALESCE($3, lastUpdateById)
       WHERE id = $4
       RETURNING id, name, description, lastUpdate, lastUpdateById`,
      [name, description, lastUpdateById, this.id]
    );

    if (result.rows.length === 0) {
      throw new Error('Workproduct not found');
    }

    const updated = new Workproduct(result.rows[0]);
    Object.assign(this, updated);
    return this;
  }

  async delete() {
    const result = await pool.query(
      'DELETE FROM Workproduct WHERE id = $1',
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
      'DELETE FROM workproductPractice WHERE workproductId = $1',
      [this.id]
    );

    // Then add new links
    const values = practiceVersionIds.map((practiceVersionId, index) => 
      `($${index + 2}, $1)`
    ).join(', ');

    const query = `INSERT INTO workproductPractice (practiceVersionId, workproductId) VALUES ${values}`;
    await pool.query(query, [this.id, ...practiceVersionIds]);
  }

  async unlinkFromPracticeVersion(practiceVersionId) {
    const result = await pool.query(
      'DELETE FROM workproductPractice WHERE practiceVersionId = $1 AND workproductId = $2',
      [practiceVersionId, this.id]
    );

    return result.rowCount > 0;
  }

  async getPracticeVersions() {
    const result = await pool.query(
      `SELECT pv.*, p.name as practiceName
       FROM practiceVersion pv
       JOIN Practice p ON pv.practiceId = p.id
       JOIN workproductPractice wp ON pv.id = wp.practiceVersionId
       WHERE wp.workproductId = $1
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

module.exports = Workproduct;