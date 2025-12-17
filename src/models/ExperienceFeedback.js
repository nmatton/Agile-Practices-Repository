const pool = require('../config/database');

class ExperienceFeedback {
  constructor(data) {
    this.id = data.id;
    this.practiceVersionId = data.practiceversionid || data.practiceVersionId;
    this.personId = data.personid || data.personId;
    this.projectContext = data.projectcontext || data.projectContext;
    this.feedbackText = data.feedbacktext || data.feedbackText;
    this.rating = data.rating;
    this.isValidated = data.isvalidated || data.isValidated || false;
    this.validatedBy = data.validatedby || data.validatedBy;
    this.validatedAt = data.validatedat || data.validatedAt;
    this.createdAt = data.createdat || data.createdAt;
    this.updatedAt = data.updatedat || data.updatedAt;
    
    // Additional fields from joins
    this.authorName = data.authorname || data.authorName;
    this.practiceName = data.practicename || data.practiceName;
    this.validatorName = data.validatorname || data.validatorName;
  }

  static async create({ practiceVersionId, personId, projectContext, feedbackText, rating }) {
    // Validate input
    if (!practiceVersionId || !personId || !feedbackText) {
      throw new Error('Practice version ID, person ID, and feedback text are required');
    }

    if (rating && (rating < 1 || rating > 5)) {
      throw new Error('Rating must be between 1 and 5');
    }

    try {
      const result = await pool.query(
        `INSERT INTO ExperienceFeedback (practiceVersionId, personId, projectContext, feedbackText, rating, createdAt, updatedAt) 
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
         RETURNING id, practiceVersionId, personId, projectContext, feedbackText, rating, isValidated, createdAt, updatedAt`,
        [practiceVersionId, personId, projectContext || null, feedbackText, rating || null]
      );

      return new ExperienceFeedback(result.rows[0]);
    } catch (error) {
      if (error.code === '23503') { // Foreign key constraint violation
        throw new Error('Invalid practice version or person ID');
      }
      throw error;
    }
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT ef.*, 
              p.name as authorName,
              pr.name as practiceName,
              v.name as validatorName
       FROM ExperienceFeedback ef
       JOIN Person p ON ef.personId = p.id
       LEFT JOIN practiceVersion pv ON ef.practiceVersionId = pv.id
       LEFT JOIN Practice pr ON pv.practiceId = pr.id
       LEFT JOIN Person v ON ef.validatedBy = v.id
       WHERE ef.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new ExperienceFeedback(result.rows[0]);
  }

  static async findByPracticeVersion(practiceVersionId, { includeUnvalidated = false, limit = 50, offset = 0 } = {}) {
    let query = `
      SELECT ef.*, 
             p.name as authorName,
             pr.name as practiceName,
             v.name as validatorName
      FROM ExperienceFeedback ef
      JOIN Person p ON ef.personId = p.id
      LEFT JOIN practiceVersion pv ON ef.practiceVersionId = pv.id
      LEFT JOIN Practice pr ON pv.practiceId = pr.id
      LEFT JOIN Person v ON ef.validatedBy = v.id
      WHERE ef.practiceVersionId = $1
    `;

    const params = [practiceVersionId];

    if (!includeUnvalidated) {
      query += ' AND ef.isValidated = true';
    }

    query += ' ORDER BY ef.createdAt DESC LIMIT $2 OFFSET $3';
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows.map(row => new ExperienceFeedback(row));
  }

  static async findByPerson(personId, { limit = 50, offset = 0 } = {}) {
    const result = await pool.query(
      `SELECT ef.*, 
              p.name as authorName,
              pr.name as practiceName,
              v.name as validatorName
       FROM ExperienceFeedback ef
       JOIN Person p ON ef.personId = p.id
       LEFT JOIN practiceVersion pv ON ef.practiceVersionId = pv.id
       LEFT JOIN Practice pr ON pv.practiceId = pr.id
       LEFT JOIN Person v ON ef.validatedBy = v.id
       WHERE ef.personId = $1
       ORDER BY ef.createdAt DESC
       LIMIT $2 OFFSET $3`,
      [personId, limit, offset]
    );

    return result.rows.map(row => new ExperienceFeedback(row));
  }

  static async findPendingValidation({ limit = 50, offset = 0 } = {}) {
    const result = await pool.query(
      `SELECT ef.*, 
              p.name as authorName,
              pr.name as practiceName
       FROM ExperienceFeedback ef
       JOIN Person p ON ef.personId = p.id
       LEFT JOIN practiceVersion pv ON ef.practiceVersionId = pv.id
       LEFT JOIN Practice pr ON pv.practiceId = pr.id
       WHERE ef.isValidated = false
       ORDER BY ef.createdAt ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows.map(row => new ExperienceFeedback(row));
  }

  static async getStatsByPracticeVersion(practiceVersionId) {
    const result = await pool.query(
      `SELECT 
         COUNT(*) as totalFeedback,
         COUNT(*) FILTER (WHERE isValidated = true) as validatedFeedback,
         AVG(rating) FILTER (WHERE isValidated = true AND rating IS NOT NULL) as averageRating,
         COUNT(*) FILTER (WHERE rating IS NOT NULL AND isValidated = true) as ratedFeedback
       FROM ExperienceFeedback 
       WHERE practiceVersionId = $1`,
      [practiceVersionId]
    );

    const stats = result.rows[0];
    return {
      totalFeedback: parseInt(stats.totalfeedback),
      validatedFeedback: parseInt(stats.validatedfeedback),
      averageRating: stats.averagerating ? parseFloat(stats.averagerating) : null,
      ratedFeedback: parseInt(stats.ratedfeedback)
    };
  }

  async validate(validatedBy) {
    if (!validatedBy) {
      throw new Error('Validator ID is required');
    }

    const result = await pool.query(
      `UPDATE ExperienceFeedback 
       SET isValidated = true, 
           validatedBy = $1, 
           validatedAt = CURRENT_TIMESTAMP,
           updatedAt = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, practiceVersionId, personId, projectContext, feedbackText, rating, isValidated, validatedBy, validatedAt, createdAt, updatedAt`,
      [validatedBy, this.id]
    );

    if (result.rows.length === 0) {
      throw new Error('Feedback not found');
    }

    const updated = new ExperienceFeedback(result.rows[0]);
    Object.assign(this, updated);
    return this;
  }

  async reject() {
    const result = await pool.query(
      'DELETE FROM ExperienceFeedback WHERE id = $1',
      [this.id]
    );

    return result.rowCount > 0;
  }

  async update({ projectContext, feedbackText, rating }) {
    const result = await pool.query(
      `UPDATE ExperienceFeedback 
       SET projectContext = COALESCE($1, projectContext),
           feedbackText = COALESCE($2, feedbackText),
           rating = COALESCE($3, rating),
           updatedAt = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, practiceVersionId, personId, projectContext, feedbackText, rating, isValidated, validatedBy, validatedAt, createdAt, updatedAt`,
      [projectContext, feedbackText, rating, this.id]
    );

    if (result.rows.length === 0) {
      throw new Error('Feedback not found');
    }

    const updated = new ExperienceFeedback(result.rows[0]);
    Object.assign(this, updated);
    return this;
  }

  async delete() {
    const result = await pool.query(
      'DELETE FROM ExperienceFeedback WHERE id = $1',
      [this.id]
    );

    return result.rowCount > 0;
  }

  toJSON() {
    return {
      id: this.id,
      practiceVersionId: this.practiceVersionId,
      personId: this.personId,
      projectContext: this.projectContext,
      feedbackText: this.feedbackText,
      rating: this.rating,
      isValidated: this.isValidated,
      validatedBy: this.validatedBy,
      validatedAt: this.validatedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      authorName: this.authorName,
      practiceName: this.practiceName,
      validatorName: this.validatorName
    };
  }
}

module.exports = ExperienceFeedback;