const pool = require('../config/database');

class BfProfile {
  constructor(data = {}) {
    this.id = data.id;
    this.personId = data.personid || data.personId;
    this.statusId = data.statusid || data.statusId;
    this.o = data.o; // Openness
    this.c = data.c; // Conscientiousness
    this.e = data.e; // Extraversion
    this.a = data.a; // Agreeableness
    this.n = data.n; // Neuroticism
  }

  static async create({ personId, statusId = 1, o = null, c = null, e = null, a = null, n = null }) {
    if (!personId) {
      throw new Error('Person ID is required');
    }

    try {
      const result = await pool.query(
        `INSERT INTO bfProfile (personId, statusId, o, c, e, a, n) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING *`,
        [personId, statusId, o, c, e, a, n]
      );

      return new BfProfile(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  static async findByPersonId(personId) {
    const result = await pool.query(
      'SELECT * FROM bfProfile WHERE personId = $1',
      [personId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new BfProfile(result.rows[0]);
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM bfProfile WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new BfProfile(result.rows[0]);
  }

  async update({ statusId, o, c, e, a, n }) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (statusId !== undefined) {
      updates.push(`statusId = $${paramCount++}`);
      values.push(statusId);
    }
    if (o !== undefined) {
      updates.push(`o = $${paramCount++}`);
      values.push(o);
    }
    if (c !== undefined) {
      updates.push(`c = $${paramCount++}`);
      values.push(c);
    }
    if (e !== undefined) {
      updates.push(`e = $${paramCount++}`);
      values.push(e);
    }
    if (a !== undefined) {
      updates.push(`a = $${paramCount++}`);
      values.push(a);
    }
    if (n !== undefined) {
      updates.push(`n = $${paramCount++}`);
      values.push(n);
    }

    if (updates.length === 0) {
      return this;
    }

    values.push(this.id);
    const result = await pool.query(
      `UPDATE bfProfile SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    const updatedProfile = new BfProfile(result.rows[0]);

    // Trigger automatic recalculation of affinities if profile is now complete
    if (updatedProfile.isComplete()) {
      // Import here to avoid circular dependency
      const PersonalityService = require('../services/personalityService');
      
      // Recalculate affinities asynchronously (don't wait for completion)
      setImmediate(async () => {
        try {
          await PersonalityService.recalculateAffinities(updatedProfile.personId);
        } catch (error) {
          console.error('Error auto-recalculating affinities:', error);
        }
      });
    }

    return updatedProfile;
  }

  // Calculate Big Five scores from survey results
  static calculateBigFiveScores(surveyResults) {
    // This is a simplified calculation - in reality, this would be more complex
    // and based on validated psychological instruments
    const scores = { o: 0, c: 0, e: 0, a: 0, n: 0 };
    
    if (!surveyResults || surveyResults.length === 0) {
      return scores;
    }

    // Simple averaging approach - in practice, this would use proper scoring algorithms
    surveyResults.forEach(result => {
      // Map survey items to Big Five dimensions based on content
      // This is a simplified mapping for demonstration
      if (result.itemId === 1) { // "I prefer clearly defined tasks" -> Conscientiousness
        scores.c += result.result / 5.0; // Normalize to 0-1 scale
      } else if (result.itemId === 2) { // "I enjoy brainstorming with groups" -> Extraversion
        scores.e += result.result / 5.0;
      } else if (result.itemId === 3) { // "I am comfortable with changes" -> low Neuroticism
        scores.n += (6 - result.result) / 5.0; // Reverse score for neuroticism
      }
    });

    // Normalize scores (this is simplified - real instruments have complex scoring)
    const itemCount = surveyResults.length;
    if (itemCount > 0) {
      Object.keys(scores).forEach(key => {
        scores[key] = Math.min(1.0, Math.max(0.0, scores[key] / itemCount));
      });
    }

    return scores;
  }

  isComplete() {
    return this.o !== null && this.c !== null && this.e !== null && 
           this.a !== null && this.n !== null;
  }

  toJSON() {
    return {
      id: this.id,
      personId: this.personId,
      statusId: this.statusId,
      o: this.o,
      c: this.c,
      e: this.e,
      a: this.a,
      n: this.n
    };
  }
}

module.exports = BfProfile;