const pool = require('../config/database');

class AffinityPractice {
  constructor(data) {
    this.id = data.id;
    this.itemId = data.itemid || data.itemId;
    this.practiceVersionId = data.practiceversionid || data.practiceVersionId;
  }

  static async create({ itemId, practiceVersionId }) {
    if (!itemId || !practiceVersionId) {
      throw new Error('Item ID and practice version ID are required');
    }

    try {
      const result = await pool.query(
        `INSERT INTO affinityPractice (itemId, practiceVersionId) 
         VALUES ($1, $2) 
         RETURNING *`,
        [itemId, practiceVersionId]
      );

      return new AffinityPractice(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  static async findByItemId(itemId) {
    const result = await pool.query(
      `SELECT ap.*, p.name as practiceName, pv.versionName 
       FROM affinityPractice ap 
       JOIN practiceVersion pv ON ap.practiceVersionId = pv.id 
       JOIN Practice p ON pv.practiceId = p.id 
       WHERE ap.itemId = $1`,
      [itemId]
    );

    return result.rows.map(row => ({
      ...new AffinityPractice(row),
      practiceName: row.practicename,
      versionName: row.versionname
    }));
  }

  static async findByPracticeVersionId(practiceVersionId) {
    const result = await pool.query(
      `SELECT ap.*, asv.version, asu.content, asu.description 
       FROM affinityPractice ap 
       JOIN affinitySurveyVersion asv ON ap.itemId = asv.id 
       JOIN affinitySurvey asu ON asv.itemId = asu.id 
       WHERE ap.practiceVersionId = $1`,
      [practiceVersionId]
    );

    return result.rows.map(row => ({
      ...new AffinityPractice(row),
      version: row.version,
      content: row.content,
      description: row.description
    }));
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM affinityPractice WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new AffinityPractice(result.rows[0]);
  }

  static async findAll() {
    const result = await pool.query(
      `SELECT ap.*, asv.version, asu.content, asu.description, 
              p.name as practiceName, pv.versionName 
       FROM affinityPractice ap 
       JOIN affinitySurveyVersion asv ON ap.itemId = asv.id 
       JOIN affinitySurvey asu ON asv.itemId = asu.id 
       JOIN practiceVersion pv ON ap.practiceVersionId = pv.id 
       JOIN Practice p ON pv.practiceId = p.id 
       ORDER BY asu.id, pv.id`
    );

    return result.rows.map(row => ({
      ...new AffinityPractice(row),
      version: row.version,
      content: row.content,
      description: row.description,
      practiceName: row.practicename,
      versionName: row.versionname
    }));
  }

  async delete() {
    await pool.query('DELETE FROM affinityPractice WHERE id = $1', [this.id]);
  }

  // Batch create multiple links
  static async createBatch(itemId, practiceVersionIds) {
    if (!itemId || !Array.isArray(practiceVersionIds) || practiceVersionIds.length === 0) {
      throw new Error('Item ID and practice version IDs array are required');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const links = [];
      for (const practiceVersionId of practiceVersionIds) {
        const result = await client.query(
          `INSERT INTO affinityPractice (itemId, practiceVersionId) 
           VALUES ($1, $2) 
           RETURNING *`,
          [itemId, practiceVersionId]
        );

        links.push(new AffinityPractice(result.rows[0]));
      }

      await client.query('COMMIT');
      return links;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Remove all links for an item and create new ones
  static async replaceBatch(itemId, practiceVersionIds) {
    if (!itemId) {
      throw new Error('Item ID is required');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Remove existing links
      await client.query('DELETE FROM affinityPractice WHERE itemId = $1', [itemId]);
      
      // Create new links if provided
      const links = [];
      if (Array.isArray(practiceVersionIds) && practiceVersionIds.length > 0) {
        for (const practiceVersionId of practiceVersionIds) {
          const result = await client.query(
            `INSERT INTO affinityPractice (itemId, practiceVersionId) 
             VALUES ($1, $2) 
             RETURNING *`,
            [itemId, practiceVersionId]
          );

          links.push(new AffinityPractice(result.rows[0]));
        }
      }

      await client.query('COMMIT');
      return links;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  toJSON() {
    return {
      id: this.id,
      itemId: this.itemId,
      practiceVersionId: this.practiceVersionId
    };
  }
}

module.exports = AffinityPractice;