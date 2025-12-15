const pool = require('../config/database');

class MethodVersion {
  constructor(data) {
    this.id = data.id;
    this.methodId = data.methodid || data.methodId;
    this.universeId = data.universeid || data.universeId;
    this.versionName = data.versionname || data.versionName;
    this.versionTimestamp = data.versiontimestamp || data.versionTimestamp;
    this.changeDescription = data.changedescription || data.changeDescription;
    this.lastUpdate = data.lastupdate || data.lastUpdate;
    this.lastUpdateById = data.lastupdatebyid || data.lastUpdateById;
  }

  static async create({ methodId, universeId, versionName, changeDescription, lastUpdateById }) {
    // Validate input
    if (!methodId || !universeId || !versionName || !lastUpdateById) {
      throw new Error('Method ID, universe ID, version name, and last update by ID are required');
    }

    try {
      const result = await pool.query(
        `INSERT INTO methodVersion (methodId, universeId, versionName, changeDescription, lastUpdate, lastUpdateById) 
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5) 
         RETURNING id, methodId, universeId, versionName, versionTimestamp, changeDescription, lastUpdate, lastUpdateById`,
        [methodId, universeId, versionName, changeDescription || null, lastUpdateById]
      );

      return new MethodVersion(result.rows[0]);
    } catch (error) {
      if (error.code === '23503') { // Foreign key constraint violation
        throw new Error('Invalid method ID, universe ID, or user ID');
      }
      throw error;
    }
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM methodVersion WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new MethodVersion(result.rows[0]);
  }

  static async findByMethodAndUniverse(methodId, universeId) {
    const result = await pool.query(
      'SELECT * FROM methodVersion WHERE methodId = $1 AND universeId = $2 ORDER BY versionTimestamp DESC',
      [methodId, universeId]
    );

    return result.rows.map(row => new MethodVersion(row));
  }

  async update({ versionName, changeDescription, lastUpdateById }) {
    const result = await pool.query(
      `UPDATE methodVersion 
       SET versionName = COALESCE($1, versionName), 
           changeDescription = COALESCE($2, changeDescription),
           lastUpdate = CURRENT_TIMESTAMP,
           lastUpdateById = COALESCE($3, lastUpdateById)
       WHERE id = $4
       RETURNING id, methodId, universeId, versionName, versionTimestamp, changeDescription, lastUpdate, lastUpdateById`,
      [versionName, changeDescription, lastUpdateById, this.id]
    );

    if (result.rows.length === 0) {
      throw new Error('Method version not found');
    }

    const updated = new MethodVersion(result.rows[0]);
    Object.assign(this, updated);
    return this;
  }

  async delete() {
    const result = await pool.query(
      'DELETE FROM methodVersion WHERE id = $1',
      [this.id]
    );

    return result.rowCount > 0;
  }

  async getPractices() {
    const result = await pool.query(
      `SELECT pv.*, p.name as practiceName, p.objective, p.description as practiceDescription
       FROM practiceVersion pv
       JOIN Practice p ON pv.practiceId = p.id
       JOIN practiceMethod pm ON pv.id = pm.practiceVersionId
       WHERE pm.methodVersionId = $1
       ORDER BY p.name`,
      [this.id]
    );

    return result.rows;
  }

  async addPractice(practiceVersionId) {
    if (!practiceVersionId) {
      throw new Error('Practice version ID is required');
    }

    try {
      await pool.query(
        `INSERT INTO practiceMethod (methodVersionId, practiceVersionId) 
         VALUES ($1, $2)`,
        [this.id, practiceVersionId]
      );
      return true;
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Practice is already part of this method version');
      }
      if (error.code === '23503') { // Foreign key constraint violation
        throw new Error('Invalid practice version ID');
      }
      throw error;
    }
  }

  async removePractice(practiceVersionId) {
    const result = await pool.query(
      `DELETE FROM practiceMethod 
       WHERE methodVersionId = $1 AND practiceVersionId = $2`,
      [this.id, practiceVersionId]
    );

    return result.rowCount > 0;
  }

  async getMethod() {
    const Method = require('./Method');
    return Method.findById(this.methodId);
  }

  async getUniverse() {
    const Universe = require('./Universe');
    return Universe.findById(this.universeId);
  }

  toJSON() {
    return {
      id: this.id,
      methodId: this.methodId,
      universeId: this.universeId,
      versionName: this.versionName,
      versionTimestamp: this.versionTimestamp,
      changeDescription: this.changeDescription,
      lastUpdate: this.lastUpdate,
      lastUpdateById: this.lastUpdateById
    };
  }
}

module.exports = MethodVersion;