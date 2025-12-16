const pool = require('../config/database');

class AffinitySurveyVersion {
  constructor(data) {
    this.id = data.id;
    this.itemId = data.itemid || data.itemId;
    this.version = data.version;
    this.versionNote = data.versionnote || data.versionNote;
  }

  static async create({ itemId, version, versionNote = null }) {
    if (!itemId || !version) {
      throw new Error('Item ID and version are required');
    }

    try {
      const result = await pool.query(
        `INSERT INTO affinitySurveyVersion (itemId, version, versionNote) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [itemId, version, versionNote]
      );

      return new AffinitySurveyVersion(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Version already exists for this item');
      }
      throw error;
    }
  }

  static async findByItemId(itemId) {
    const result = await pool.query(
      'SELECT * FROM affinitySurveyVersion WHERE itemId = $1 ORDER BY version DESC',
      [itemId]
    );

    return result.rows.map(row => new AffinitySurveyVersion(row));
  }

  static async findLatestByItemId(itemId) {
    const result = await pool.query(
      'SELECT * FROM affinitySurveyVersion WHERE itemId = $1 ORDER BY version DESC LIMIT 1',
      [itemId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new AffinitySurveyVersion(result.rows[0]);
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM affinitySurveyVersion WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new AffinitySurveyVersion(result.rows[0]);
  }

  static async findAll() {
    const result = await pool.query(
      `SELECT asv.*, asu.content, asu.description, asu.comment 
       FROM affinitySurveyVersion asv 
       JOIN affinitySurvey asu ON asv.itemId = asu.id 
       ORDER BY asv.itemId, asv.version DESC`
    );

    return result.rows.map(row => ({
      ...new AffinitySurveyVersion(row),
      surveyContent: row.content,
      surveyDescription: row.description,
      surveyComment: row.comment
    }));
  }

  async update({ versionNote }) {
    if (versionNote === undefined) {
      return this;
    }

    const result = await pool.query(
      `UPDATE affinitySurveyVersion SET versionNote = $1 WHERE id = $2 RETURNING *`,
      [versionNote, this.id]
    );

    return new AffinitySurveyVersion(result.rows[0]);
  }

  async delete() {
    await pool.query('DELETE FROM affinitySurveyVersion WHERE id = $1', [this.id]);
  }

  toJSON() {
    return {
      id: this.id,
      itemId: this.itemId,
      version: this.version,
      versionNote: this.versionNote
    };
  }
}

module.exports = AffinitySurveyVersion;