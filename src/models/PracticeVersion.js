const pool = require('../config/database');

class PracticeVersion {
  constructor(data) {
    this.id = data.id;
    this.practiceId = data.practiceid || data.practiceId;
    this.universeId = data.universeid || data.universeId;
    this.versionName = data.versionname || data.versionName;
    this.versionTimestamp = data.versiontimestamp || data.versionTimestamp;
    this.changeDescription = data.changedescription || data.changeDescription;
    this.lastUpdate = data.lastupdate || data.lastUpdate;
    this.lastUpdateById = data.lastupdatebyid || data.lastUpdateById;
    this.status = data.status || 'Draft'; // Default status
  }

  static async create({ practiceId, universeId, versionName, changeDescription, lastUpdateById, status = 'Draft' }) {
    // Validate input
    if (!practiceId || !universeId || !versionName || !lastUpdateById) {
      throw new Error('Practice ID, universe ID, version name, and last update by ID are required');
    }

    try {
      const result = await pool.query(
        `INSERT INTO practiceVersion (practiceId, universeId, versionName, changeDescription, lastUpdate, lastUpdateById) 
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5) 
         RETURNING id, practiceId, universeId, versionName, versionTimestamp, changeDescription, lastUpdate, lastUpdateById`,
        [practiceId, universeId, versionName, changeDescription || null, lastUpdateById]
      );

      const practiceVersion = new PracticeVersion(result.rows[0]);
      practiceVersion.status = status;
      return practiceVersion;
    } catch (error) {
      if (error.code === '23503') { // Foreign key constraint violation
        throw new Error('Invalid practice ID, universe ID, or user ID');
      }
      throw error;
    }
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM practiceVersion WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new PracticeVersion(result.rows[0]);
  }

  static async findByPracticeAndUniverse(practiceId, universeId) {
    const result = await pool.query(
      'SELECT * FROM practiceVersion WHERE practiceId = $1 AND universeId = $2 ORDER BY versionTimestamp DESC',
      [practiceId, universeId]
    );

    return result.rows.map(row => new PracticeVersion(row));
  }

  static async findAll({ limit = 1000, offset = 0 } = {}) {
    const result = await pool.query(
      `SELECT pv.*, p.name as practiceName, p.objective, p.description as practiceDescription
       FROM practiceVersion pv
       JOIN Practice p ON pv.practiceId = p.id
       ORDER BY pv.versionTimestamp DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows.map(row => {
      const pv = new PracticeVersion(row);
      pv.practiceName = row.practicename;
      pv.practiceObjective = row.objective;
      pv.practiceDescription = row.practicedescription;
      return pv;
    });
  }

  static async findPublished({ limit = 50, offset = 0 } = {}) {
    // For now, we'll consider all practice versions as potentially published
    // In a real implementation, you might add a status column to track draft vs published
    const result = await pool.query(
      `SELECT pv.*, p.name as practiceName, p.objective, p.description as practiceDescription
       FROM practiceVersion pv
       JOIN Practice p ON pv.practiceId = p.id
       ORDER BY pv.versionTimestamp DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows.map(row => {
      const pv = new PracticeVersion(row);
      pv.practiceName = row.practicename;
      pv.practiceObjective = row.objective;
      pv.practiceDescription = row.practicedescription;
      return pv;
    });
  }

  async update({ versionName, changeDescription, lastUpdateById }) {
    const result = await pool.query(
      `UPDATE practiceVersion 
       SET versionName = COALESCE($1, versionName), 
           changeDescription = COALESCE($2, changeDescription),
           lastUpdate = CURRENT_TIMESTAMP,
           lastUpdateById = COALESCE($3, lastUpdateById)
       WHERE id = $4
       RETURNING id, practiceId, universeId, versionName, versionTimestamp, changeDescription, lastUpdate, lastUpdateById`,
      [versionName, changeDescription, lastUpdateById, this.id]
    );

    if (result.rows.length === 0) {
      throw new Error('Practice version not found');
    }

    const updated = new PracticeVersion(result.rows[0]);
    Object.assign(this, updated);
    return this;
  }

  async delete() {
    const result = await pool.query(
      'DELETE FROM practiceVersion WHERE id = $1',
      [this.id]
    );

    return result.rowCount > 0;
  }

  async publish() {
    // Change status to Published
    this.status = 'Published';
    return this;
  }

  async getActivities() {
    const result = await pool.query(
      `SELECT a.*, pva.sequence
       FROM Activity a
       JOIN practiceVersionActivity pva ON a.id = pva.activityId
       WHERE pva.practiceVersionId = $1
       ORDER BY pva.sequence`,
      [this.id]
    );

    return result.rows;
  }

  async addActivity(activityId, sequence) {
    if (!activityId || sequence === undefined) {
      throw new Error('Activity ID and sequence are required');
    }

    try {
      await pool.query(
        `INSERT INTO practiceVersionActivity (practiceVersionId, activityId, sequence) 
         VALUES ($1, $2, $3)`,
        [this.id, activityId, sequence]
      );
      return true;
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Activity already exists in this practice version or sequence number is taken');
      }
      if (error.code === '23503') { // Foreign key constraint violation
        throw new Error('Invalid activity ID');
      }
      throw error;
    }
  }

  async removeActivity(activityId) {
    const result = await pool.query(
      `DELETE FROM practiceVersionActivity 
       WHERE practiceVersionId = $1 AND activityId = $2`,
      [this.id, activityId]
    );

    return result.rowCount > 0;
  }

  async updateActivitySequence(activityId, newSequence) {
    const result = await pool.query(
      `UPDATE practiceVersionActivity 
       SET sequence = $1 
       WHERE practiceVersionId = $2 AND activityId = $3`,
      [newSequence, this.id, activityId]
    );

    return result.rowCount > 0;
  }

  async getPractice() {
    const Practice = require('./Practice');
    return Practice.findById(this.practiceId);
  }

  async getUniverse() {
    const Universe = require('./Universe');
    return Universe.findById(this.universeId);
  }

  toJSON() {
    return {
      id: this.id,
      practiceId: this.practiceId,
      universeId: this.universeId,
      versionName: this.versionName,
      versionTimestamp: this.versionTimestamp,
      changeDescription: this.changeDescription,
      lastUpdate: this.lastUpdate,
      lastUpdateById: this.lastUpdateById,
      status: this.status
    };
  }
}

module.exports = PracticeVersion;