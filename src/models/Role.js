const pool = require('../config/database');

class Role {
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
        `INSERT INTO Role (name, description, lastUpdate, lastUpdateById) 
         VALUES ($1, $2, CURRENT_TIMESTAMP, $3) 
         RETURNING id, name, description, lastUpdate, lastUpdateById`,
        [name, description || null, lastUpdateById]
      );

      return new Role(result.rows[0]);
    } catch (error) {
      if (error.code === '23503') { // Foreign key constraint violation
        throw new Error('Invalid user ID');
      }
      throw error;
    }
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM Role WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new Role(result.rows[0]);
  }

  static async findAll({ limit = 50, offset = 0 } = {}) {
    const result = await pool.query(
      'SELECT * FROM Role ORDER BY name LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result.rows.map(row => new Role(row));
  }

  async update({ name, description, lastUpdateById }) {
    const result = await pool.query(
      `UPDATE Role 
       SET name = COALESCE($1, name), 
           description = COALESCE($2, description),
           lastUpdate = CURRENT_TIMESTAMP,
           lastUpdateById = COALESCE($3, lastUpdateById)
       WHERE id = $4
       RETURNING id, name, description, lastUpdate, lastUpdateById`,
      [name, description, lastUpdateById, this.id]
    );

    if (result.rows.length === 0) {
      throw new Error('Role not found');
    }

    const updated = new Role(result.rows[0]);
    Object.assign(this, updated);
    return this;
  }

  async delete() {
    const result = await pool.query(
      'DELETE FROM Role WHERE id = $1',
      [this.id]
    );

    return result.rowCount > 0;
  }

  async linkToPracticeVersion(practiceVersionId, typeId) {
    if (!practiceVersionId) {
      throw new Error('Practice version ID is required');
    }

    try {
      const result = await pool.query(
        `INSERT INTO roleUse (practiceVersionId, roleId, typeId) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (practiceVersionId, roleId) 
         DO UPDATE SET typeId = EXCLUDED.typeId
         RETURNING practiceVersionId, roleId, typeId`,
        [practiceVersionId, this.id, typeId || null]
      );

      return result.rows[0];
    } catch (error) {
      if (error.code === '23503') { // Foreign key constraint violation
        throw new Error('Invalid practice version ID or role use type ID');
      }
      throw error;
    }
  }

  async unlinkFromPracticeVersion(practiceVersionId) {
    const result = await pool.query(
      'DELETE FROM roleUse WHERE practiceVersionId = $1 AND roleId = $2',
      [practiceVersionId, this.id]
    );

    return result.rowCount > 0;
  }

  async getPracticeVersions() {
    const result = await pool.query(
      `SELECT pv.*, p.name as practiceName, ru.typeId as roleUseTypeId
       FROM practiceVersion pv
       JOIN Practice p ON pv.practiceId = p.id
       JOIN roleUse ru ON pv.id = ru.practiceVersionId
       WHERE ru.roleId = $1
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

module.exports = Role;