const pool = require('../config/database');

class Guideline {
  constructor(data) {
    this.id = data.id;
    this.practiceVersionId = data.practiceversionid || data.practiceVersionId;
    this.methodVersionId = data.methodversionid || data.methodVersionId;
    this.name = data.name;
    this.description = data.description;
    this.content = data.content;
    this.lastUpdate = data.lastupdate || data.lastUpdate;
    this.lastUpdateById = data.lastupdatebyid || data.lastUpdateById;
    this.typeId = data.typeid || data.typeId;
  }

  static async create({ practiceVersionId, methodVersionId, name, description, content, lastUpdateById, typeId }) {
    if (!name || !lastUpdateById) {
      throw new Error('Name and last update by ID are required');
    }

    if (!practiceVersionId && !methodVersionId) {
      throw new Error('Either practice version ID or method version ID is required');
    }

    try {
      const result = await pool.query(
        `INSERT INTO Guideline (practiceVersionId, methodVersionId, name, description, content, lastUpdate, lastUpdateById, typeId) 
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7) 
         RETURNING id, practiceVersionId, methodVersionId, name, description, content, lastUpdate, lastUpdateById, typeId`,
        [practiceVersionId || null, methodVersionId || null, name, description || null, content || null, lastUpdateById, typeId || null]
      );

      return new Guideline(result.rows[0]);
    } catch (error) {
      if (error.code === '23503') { // Foreign key constraint violation
        throw new Error('Invalid practice version ID, method version ID, user ID, or type ID');
      }
      throw error;
    }
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM Guideline WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new Guideline(result.rows[0]);
  }

  static async findByPracticeVersionId(practiceVersionId) {
    const result = await pool.query(
      'SELECT * FROM Guideline WHERE practiceVersionId = $1 ORDER BY name',
      [practiceVersionId]
    );
    return result.rows.map(row => new Guideline(row));
  }

  static async findByMethodVersionId(methodVersionId) {
    const result = await pool.query(
      'SELECT * FROM Guideline WHERE methodVersionId = $1 ORDER BY name',
      [methodVersionId]
    );
    return result.rows.map(row => new Guideline(row));
  }

  static async findAll({ practiceVersionId, methodVersionId, typeId, limit = 50, offset = 0 } = {}) {
    let query = 'SELECT * FROM Guideline';
    const params = [];
    const conditions = [];
    
    if (practiceVersionId) {
      conditions.push('practiceVersionId = $' + (params.length + 1));
      params.push(practiceVersionId);
    }
    
    if (methodVersionId) {
      conditions.push('methodVersionId = $' + (params.length + 1));
      params.push(methodVersionId);
    }
    
    if (typeId) {
      conditions.push('typeId = $' + (params.length + 1));
      params.push(typeId);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY name LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows.map(row => new Guideline(row));
  }

  async update({ name, description, content, typeId, lastUpdateById }) {
    const result = await pool.query(
      `UPDATE Guideline 
       SET name = COALESCE($1, name), 
           description = COALESCE($2, description),
           content = COALESCE($3, content),
           typeId = COALESCE($4, typeId),
           lastUpdate = CURRENT_TIMESTAMP,
           lastUpdateById = COALESCE($5, lastUpdateById)
       WHERE id = $6
       RETURNING id, practiceVersionId, methodVersionId, name, description, content, lastUpdate, lastUpdateById, typeId`,
      [name, description, content, typeId, lastUpdateById, this.id]
    );

    if (result.rows.length === 0) {
      throw new Error('Guideline not found');
    }

    const updated = new Guideline(result.rows[0]);
    Object.assign(this, updated);
    return this;
  }

  async delete() {
    const result = await pool.query(
      'DELETE FROM Guideline WHERE id = $1',
      [this.id]
    );

    return result.rowCount > 0;
  }

  toJSON() {
    return {
      id: this.id,
      practiceVersionId: this.practiceVersionId,
      methodVersionId: this.methodVersionId,
      name: this.name,
      description: this.description,
      content: this.content,
      lastUpdate: this.lastUpdate,
      lastUpdateById: this.lastUpdateById,
      typeId: this.typeId
    };
  }
}

module.exports = Guideline;