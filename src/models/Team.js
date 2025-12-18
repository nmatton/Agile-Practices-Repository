const pool = require('../config/database');

class Team {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
  }

  static async create({ name, description, creatorId }) {
    // Validate input
    if (!name || !creatorId) {
      throw new Error('Team name and creator ID are required');
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create the team
      const teamResult = await client.query(
        `INSERT INTO Team (name, description) 
         VALUES ($1, $2) 
         RETURNING id, name, description`,
        [name, description || null]
      );

      const team = new Team(teamResult.rows[0]);

      // Add creator as team member
      await client.query(
        `INSERT INTO teamMember (teamId, personId) 
         VALUES ($1, $2)`,
        [team.id, creatorId]
      );

      await client.query('COMMIT');
      return team;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM Team WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new Team(result.rows[0]);
  }

  static async findByName(name) {
    const result = await pool.query(
      'SELECT * FROM Team WHERE name = $1',
      [name]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new Team(result.rows[0]);
  }

  async getMembers() {
    const result = await pool.query(
      `SELECT p.id, p.name, p.email, p.roleId, p.createdAt
       FROM Person p
       JOIN teamMember tm ON p.id = tm.personId
       WHERE tm.teamId = $1
       ORDER BY p.name`,
      [this.id]
    );

    return result.rows;
  }

  async addMember(personId) {
    try {
      await pool.query(
        `INSERT INTO teamMember (teamId, personId) 
         VALUES ($1, $2)`,
        [this.id, personId]
      );
      return true;
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Person is already a team member');
      }
      throw error;
    }
  }

  async removeMember(personId) {
    const result = await pool.query(
      `DELETE FROM teamMember 
       WHERE teamId = $1 AND personId = $2`,
      [this.id, personId]
    );

    return result.rowCount > 0;
  }

  async isMember(personId) {
    const result = await pool.query(
      `SELECT 1 FROM teamMember 
       WHERE teamId = $1 AND personId = $2`,
      [this.id, personId]
    );

    return result.rows.length > 0;
  }

  static async getTeamsForPerson(personId) {
    const result = await pool.query(
      `SELECT t.id, t.name, t.description
       FROM Team t
       JOIN teamMember tm ON t.id = tm.teamId
       WHERE tm.personId = $1
       ORDER BY t.name`,
      [personId]
    );

    return result.rows.map(row => new Team(row));
  }

  async update({ name, description }) {
    const result = await pool.query(
      `UPDATE Team SET name = $1, description = $2 
       WHERE id = $3 
       RETURNING id, name, description`,
      [name, description || null, this.id]
    );

    if (result.rows.length === 0) {
      throw new Error('Team not found');
    }

    // Update current instance
    this.name = result.rows[0].name;
    this.description = result.rows[0].description;

    return this;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description
    };
  }
}

module.exports = Team;