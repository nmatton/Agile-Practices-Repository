const pool = require('../config/database');

class AffinitySurveyResults {
  constructor(data) {
    this.id = data.id;
    this.personId = data.personid || data.personId;
    this.itemId = data.itemid || data.itemId;
    this.result = data.result;
  }

  static async create({ personId, itemId, result }) {
    if (!personId || !itemId || result === undefined) {
      throw new Error('Person ID, item ID, and result are required');
    }

    // Validate result is within expected range (1-5 for Likert scale)
    if (result < 1 || result > 5) {
      throw new Error('Result must be between 1 and 5');
    }

    try {
      const result_query = await pool.query(
        `INSERT INTO affinitySurveyResults (personId, itemId, result) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [personId, itemId, result]
      );

      return new AffinitySurveyResults(result_query.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  static async findByPersonId(personId) {
    const result = await pool.query(
      `SELECT asr.*, asv.itemId as surveyItemId, asv.version, asu.content, asu.description 
       FROM affinitySurveyResults asr 
       JOIN affinitySurveyVersion asv ON asr.itemId = asv.id 
       JOIN affinitySurvey asu ON asv.itemId = asu.id 
       WHERE asr.personId = $1 
       ORDER BY asv.itemId, asv.version DESC`,
      [personId]
    );

    return result.rows.map(row => ({
      ...new AffinitySurveyResults(row),
      surveyItemId: row.surveyitemid,
      version: row.version,
      content: row.content,
      description: row.description
    }));
  }

  static async findByPersonAndItem(personId, itemId) {
    const result = await pool.query(
      'SELECT * FROM affinitySurveyResults WHERE personId = $1 AND itemId = $2',
      [personId, itemId]
    );

    return result.rows.map(row => new AffinitySurveyResults(row));
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM affinitySurveyResults WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new AffinitySurveyResults(result.rows[0]);
  }

  async update({ result }) {
    if (result === undefined) {
      return this;
    }

    // Validate result is within expected range
    if (result < 1 || result > 5) {
      throw new Error('Result must be between 1 and 5');
    }

    const query_result = await pool.query(
      `UPDATE affinitySurveyResults SET result = $1 WHERE id = $2 RETURNING *`,
      [result, this.id]
    );

    return new AffinitySurveyResults(query_result.rows[0]);
  }

  async delete() {
    await pool.query('DELETE FROM affinitySurveyResults WHERE id = $1', [this.id]);
  }

  // Batch create multiple results for a person
  static async createBatch(personId, results) {
    if (!personId || !Array.isArray(results) || results.length === 0) {
      throw new Error('Person ID and results array are required');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const createdResults = [];
      for (const resultData of results) {
        const { itemId, result } = resultData;
        
        if (!itemId || result === undefined) {
          throw new Error('Each result must have itemId and result');
        }
        
        if (result < 1 || result > 5) {
          throw new Error('Result must be between 1 and 5');
        }

        const query_result = await client.query(
          `INSERT INTO affinitySurveyResults (personId, itemId, result) 
           VALUES ($1, $2, $3) 
           RETURNING *`,
          [personId, itemId, result]
        );

        createdResults.push(new AffinitySurveyResults(query_result.rows[0]));
      }

      await client.query('COMMIT');
      return createdResults;
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
      personId: this.personId,
      itemId: this.itemId,
      result: this.result
    };
  }
}

module.exports = AffinitySurveyResults;