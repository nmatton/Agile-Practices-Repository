const pool = require('../config/database');

class TeamInvitation {
  constructor(data) {
    this.id = data.id;
    this.teamId = data.teamid || data.teamId;
    this.inviterPersonId = data.inviterpersonid || data.inviterPersonId;
    this.invitedEmail = data.invitedemail || data.invitedEmail;
    this.invitedAt = data.invitedat || data.invitedAt;
    this.lastSentAt = data.lastsentat || data.lastSentAt;
    this.status = data.status;
    this.acceptedAt = data.acceptedat || data.acceptedAt;
    this.acceptedByPersonId = data.acceptedbypersonid || data.acceptedByPersonId;
  }

  static async create({ teamId, inviterPersonId, invitedEmail }) {
    // First check if there's already a pending invitation
    const existing = await this.findPendingByTeamAndEmail(teamId, invitedEmail);
    if (existing) {
      // Update the last sent timestamp
      return await existing.updateLastSent();
    }

    const result = await pool.query(
      `INSERT INTO teamInvitation (teamId, inviterPersonId, invitedEmail) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [teamId, inviterPersonId, invitedEmail]
    );

    return new TeamInvitation(result.rows[0]);
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM teamInvitation WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new TeamInvitation(result.rows[0]);
  }

  static async findPendingByTeamAndEmail(teamId, email) {
    const result = await pool.query(
      `SELECT * FROM teamInvitation 
       WHERE teamId = $1 AND invitedEmail = $2 AND status = 'pending'`,
      [teamId, email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new TeamInvitation(result.rows[0]);
  }

  static async findByTeamId(teamId) {
    const result = await pool.query(
      `SELECT ti.*, p.name as inviterName
       FROM teamInvitation ti
       JOIN Person p ON ti.inviterPersonId = p.id
       WHERE ti.teamId = $1
       ORDER BY ti.invitedAt DESC`,
      [teamId]
    );

    return result.rows.map(row => ({
      ...new TeamInvitation(row),
      inviterName: row.invitername
    }));
  }

  static async findPendingByEmail(email) {
    const result = await pool.query(
      `SELECT ti.*, t.name as teamName, p.name as inviterName
       FROM teamInvitation ti
       JOIN Team t ON ti.teamId = t.id
       JOIN Person p ON ti.inviterPersonId = p.id
       WHERE ti.invitedEmail = $1 AND ti.status = 'pending'
       ORDER BY ti.invitedAt DESC`,
      [email]
    );

    return result.rows.map(row => ({
      ...new TeamInvitation(row),
      teamName: row.teamname,
      inviterName: row.invitername
    }));
  }

  async updateLastSent() {
    const result = await pool.query(
      `UPDATE teamInvitation 
       SET lastSentAt = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [this.id]
    );

    if (result.rows.length === 0) {
      throw new Error('Invitation not found');
    }

    // Update current instance
    this.lastSentAt = result.rows[0].lastsentat;
    return this;
  }

  async accept(personId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Update invitation status
      await client.query(
        `UPDATE teamInvitation 
         SET status = 'accepted', acceptedAt = CURRENT_TIMESTAMP, acceptedByPersonId = $1 
         WHERE id = $2`,
        [personId, this.id]
      );

      // Add person to team
      await client.query(
        `INSERT INTO teamMember (teamId, personId) 
         VALUES ($1, $2) 
         ON CONFLICT (teamId, personId) DO NOTHING`,
        [this.teamId, personId]
      );

      await client.query('COMMIT');

      // Update current instance
      this.status = 'accepted';
      this.acceptedAt = new Date();
      this.acceptedByPersonId = personId;

      return this;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async acceptAllPendingForEmail(email, personId) {
    const pendingInvitations = await this.findPendingByEmail(email);
    const results = [];

    for (const invitation of pendingInvitations) {
      try {
        const fullInvitation = new TeamInvitation(invitation);
        await fullInvitation.accept(personId);
        results.push({
          teamId: fullInvitation.teamId,
          teamName: invitation.teamName,
          success: true
        });
      } catch (error) {
        console.error(`Failed to accept invitation for team ${invitation.teamId}:`, error);
        results.push({
          teamId: invitation.teamId,
          teamName: invitation.teamName,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  toJSON() {
    return {
      id: this.id,
      teamId: this.teamId,
      inviterPersonId: this.inviterPersonId,
      invitedEmail: this.invitedEmail,
      invitedAt: this.invitedAt,
      lastSentAt: this.lastSentAt,
      status: this.status,
      acceptedAt: this.acceptedAt,
      acceptedByPersonId: this.acceptedByPersonId
    };
  }
}

module.exports = TeamInvitation;