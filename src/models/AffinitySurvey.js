const pool = require('../config/database');

class AffinitySurvey {
  constructor(data) {
    this.id = data.id;
    this.content = data.content;
    this.description = data.description;
    this.comment = data.comment;
  }

  static async create({ content, description = null, comment = null }) {
    if (!content) {
      throw new Error('Content is required');
    }

    try {
      const result = await pool.query(
        `INSERT INTO affinitySurvey (content, description, comment) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [content, description, comment]
      );

      return new AffinitySurvey(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  static async findAll() {
    const result = await pool.query(
      'SELECT * FROM affinitySurvey ORDER BY id'
    );

    return result.rows.map(row => new AffinitySurvey(row));
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM affinitySurvey WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new AffinitySurvey(result.rows[0]);
  }

  async update({ content, description, comment }) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (content !== undefined) {
      updates.push(`content = $${paramCount++}`);
      values.push(content);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (comment !== undefined) {
      updates.push(`comment = $${paramCount++}`);
      values.push(comment);
    }

    if (updates.length === 0) {
      return this;
    }

    values.push(this.id);
    const result = await pool.query(
      `UPDATE affinitySurvey SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return new AffinitySurvey(result.rows[0]);
  }

  async delete() {
    await pool.query('DELETE FROM affinitySurvey WHERE id = $1', [this.id]);
  }

  toJSON() {
    return {
      id: this.id,
      content: this.content,
      description: this.description,
      comment: this.comment
    };
  }
}

module.exports = AffinitySurvey;