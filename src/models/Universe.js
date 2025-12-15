const pool = require('../config/database');

class Universe {
  constructor(data) {
    this.id = data.id;
    this.teamId = data.teamid || data.teamId;
    this.name = data.name;
    this.description = data.description;
  }

  static async create({ teamId, name, description }) {
    // Validate input
    if (!teamId || !name) {
      throw new Error('Team ID and universe name are required');
    }

    try {
      const result = await pool.query(
        `INSERT INTO Universe (teamId, name, description) 
         VALUES ($1, $2, $3) 
         RETURNING id, teamId, name, description`,
        [teamId, name, description || null]
      );

      return new Universe(result.rows[0]);
    } catch (error) {
      if (error.code === '23503') { // Foreign key constraint violation
        throw new Error('Team does not exist');
      }
      throw error;
    }
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM Universe WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new Universe(result.rows[0]);
  }

  static async findByTeamId(teamId) {
    const result = await pool.query(
      'SELECT * FROM Universe WHERE teamId = $1 ORDER BY name',
      [teamId]
    );

    return result.rows.map(row => new Universe(row));
  }

  static async findByTeamAndName(teamId, name) {
    const result = await pool.query(
      'SELECT * FROM Universe WHERE teamId = $1 AND name = $2',
      [teamId, name]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new Universe(result.rows[0]);
  }

  async update({ name, description }) {
    const result = await pool.query(
      `UPDATE Universe 
       SET name = COALESCE($1, name), 
           description = COALESCE($2, description)
       WHERE id = $3
       RETURNING id, teamId, name, description`,
      [name, description, this.id]
    );

    if (result.rows.length === 0) {
      throw new Error('Universe not found');
    }

    const updated = new Universe(result.rows[0]);
    Object.assign(this, updated);
    return this;
  }

  async delete() {
    const result = await pool.query(
      'DELETE FROM Universe WHERE id = $1',
      [this.id]
    );

    return result.rowCount > 0;
  }

  async getTeam() {
    const Team = require('./Team');
    return Team.findById(this.teamId);
  }

  async getActivePractices() {
    const result = await pool.query(
      `SELECT pv.id, pv.practiceId, pv.versionName, pv.changeDescription,
              p.name as practiceName, p.objective, p.description
       FROM practiceVersion pv
       JOIN Practice p ON pv.practiceId = p.id
       JOIN PracticeVersionUniverse pvu ON pv.id = pvu.practiceVersionId
       WHERE pvu.universeId = $1 AND pvu.isActive = true
       ORDER BY p.name`,
      [this.id]
    );

    return result.rows;
  }

  async addPractice(practiceVersionId, isActive = true) {
    try {
      await pool.query(
        `INSERT INTO PracticeVersionUniverse (practiceVersionId, universeId, isActive) 
         VALUES ($1, $2, $3)
         ON CONFLICT (practiceVersionId, universeId) 
         DO UPDATE SET isActive = $3`,
        [practiceVersionId, this.id, isActive]
      );
      return true;
    } catch (error) {
      if (error.code === '23503') { // Foreign key constraint violation
        throw new Error('Practice version does not exist');
      }
      throw error;
    }
  }

  async removePractice(practiceVersionId) {
    const result = await pool.query(
      `DELETE FROM PracticeVersionUniverse 
       WHERE practiceVersionId = $1 AND universeId = $2`,
      [practiceVersionId, this.id]
    );

    return result.rowCount > 0;
  }

  toJSON() {
    return {
      id: this.id,
      teamId: this.teamId,
      name: this.name,
      description: this.description
    };
  }
}

module.exports = Universe;