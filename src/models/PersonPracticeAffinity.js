const pool = require('../config/database');

class PersonPracticeAffinity {
  constructor(data) {
    this.id = data.id;
    this.personId = data.personid || data.personId;
    this.practiceVersionId = data.practiceversionid || data.practiceVersionId;
    this.affinity = data.affinity;
  }

  static async create({ personId, practiceVersionId, affinity }) {
    if (!personId || !practiceVersionId || affinity === undefined) {
      throw new Error('Person ID, practice version ID, and affinity are required');
    }

    // Validate affinity is within expected range (0-100)
    if (affinity < 0 || affinity > 100) {
      throw new Error('Affinity must be between 0 and 100');
    }

    try {
      const result = await pool.query(
        `INSERT INTO personPracticeAffinity (personId, practiceVersionId, affinity) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [personId, practiceVersionId, affinity]
      );

      return new PersonPracticeAffinity(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  static async findByPersonId(personId) {
    const result = await pool.query(
      `SELECT ppa.*, p.name as practiceName, pv.versionName 
       FROM personPracticeAffinity ppa 
       JOIN practiceVersion pv ON ppa.practiceVersionId = pv.id 
       JOIN Practice p ON pv.practiceId = p.id 
       WHERE ppa.personId = $1 
       ORDER BY ppa.affinity DESC`,
      [personId]
    );

    return result.rows.map(row => ({
      ...new PersonPracticeAffinity(row),
      practiceName: row.practicename,
      versionName: row.versionname
    }));
  }

  static async findByPracticeVersionId(practiceVersionId) {
    const result = await pool.query(
      `SELECT ppa.*, per.name as personName, per.email 
       FROM personPracticeAffinity ppa 
       JOIN Person per ON ppa.personId = per.id 
       WHERE ppa.practiceVersionId = $1 
       ORDER BY ppa.affinity DESC`,
      [practiceVersionId]
    );

    return result.rows.map(row => ({
      ...new PersonPracticeAffinity(row),
      personName: row.personname,
      email: row.email
    }));
  }

  static async findByPersonAndPractice(personId, practiceVersionId) {
    const result = await pool.query(
      'SELECT * FROM personPracticeAffinity WHERE personId = $1 AND practiceVersionId = $2',
      [personId, practiceVersionId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new PersonPracticeAffinity(result.rows[0]);
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM personPracticeAffinity WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new PersonPracticeAffinity(result.rows[0]);
  }

  async update({ affinity }) {
    if (affinity === undefined) {
      return this;
    }

    // Validate affinity is within expected range
    if (affinity < 0 || affinity > 100) {
      throw new Error('Affinity must be between 0 and 100');
    }

    const result = await pool.query(
      `UPDATE personPracticeAffinity SET affinity = $1 WHERE id = $2 RETURNING *`,
      [affinity, this.id]
    );

    return new PersonPracticeAffinity(result.rows[0]);
  }

  async delete() {
    await pool.query('DELETE FROM personPracticeAffinity WHERE id = $1', [this.id]);
  }

  // Calculate affinity based on Big Five profile and practice characteristics
  static calculateAffinity(bfProfile, practiceCharacteristics) {
    if (!bfProfile || !bfProfile.isComplete()) {
      return 0;
    }

    // This is a simplified affinity calculation algorithm
    // In practice, this would be more sophisticated and based on research
    let affinityScore = 50; // Base score

    // Example calculations based on practice characteristics
    if (practiceCharacteristics.requiresStructure) {
      affinityScore += (bfProfile.c * 30); // High conscientiousness likes structure
    }

    if (practiceCharacteristics.requiresCollaboration) {
      affinityScore += (bfProfile.e * 25); // High extraversion likes collaboration
      affinityScore += (bfProfile.a * 20); // High agreeableness likes collaboration
    }

    if (practiceCharacteristics.requiresCreativity) {
      affinityScore += (bfProfile.o * 35); // High openness likes creativity
    }

    if (practiceCharacteristics.requiresStability) {
      affinityScore -= (bfProfile.n * 25); // High neuroticism dislikes instability
    }

    // Ensure score is within 0-100 range
    return Math.max(0, Math.min(100, Math.round(affinityScore)));
  }

  // Batch calculate affinities for a person across multiple practices
  static async calculateAndStoreBatch(personId, practiceVersionIds, bfProfile) {
    if (!personId || !Array.isArray(practiceVersionIds) || !bfProfile) {
      throw new Error('Person ID, practice version IDs array, and BF profile are required');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const affinities = [];
      for (const practiceVersionId of practiceVersionIds) {
        // Get practice characteristics (simplified - in practice would be more complex)
        const practiceResult = await client.query(
          `SELECT p.name, p.description, p.typeId 
           FROM practiceVersion pv 
           JOIN Practice p ON pv.practiceId = p.id 
           WHERE pv.id = $1`,
          [practiceVersionId]
        );

        if (practiceResult.rows.length > 0) {
          const practice = practiceResult.rows[0];
          
          // Simple characteristic mapping based on practice type and description
          const characteristics = {
            requiresStructure: practice.typeid === 1, // Development practices need structure
            requiresCollaboration: practice.typeid === 2, // Teamwork practices need collaboration
            requiresCreativity: practice.description.toLowerCase().includes('innovation') || 
                              practice.description.toLowerCase().includes('creative'),
            requiresStability: !practice.description.toLowerCase().includes('change')
          };

          const affinityScore = PersonPracticeAffinity.calculateAffinity(bfProfile, characteristics);

          // Check if affinity already exists
          const existingResult = await client.query(
            'SELECT id FROM personPracticeAffinity WHERE personId = $1 AND practiceVersionId = $2',
            [personId, practiceVersionId]
          );

          if (existingResult.rows.length > 0) {
            // Update existing
            const updateResult = await client.query(
              `UPDATE personPracticeAffinity SET affinity = $1 WHERE personId = $2 AND practiceVersionId = $3 RETURNING *`,
              [affinityScore, personId, practiceVersionId]
            );
            affinities.push(new PersonPracticeAffinity(updateResult.rows[0]));
          } else {
            // Create new
            const insertResult = await client.query(
              `INSERT INTO personPracticeAffinity (personId, practiceVersionId, affinity) 
               VALUES ($1, $2, $3) RETURNING *`,
              [personId, practiceVersionId, affinityScore]
            );
            affinities.push(new PersonPracticeAffinity(insertResult.rows[0]));
          }
        }
      }

      await client.query('COMMIT');
      return affinities;
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
      practiceVersionId: this.practiceVersionId,
      affinity: this.affinity
    };
  }
}

module.exports = PersonPracticeAffinity;