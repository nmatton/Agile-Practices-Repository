const pool = require('../config/database');
const bcrypt = require('bcrypt');

class Person {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.passwordHash = data.passwordhash || data.passwordHash;
    this.roleId = data.roleid || data.roleId;
    this.createdAt = data.createdat || data.createdAt;
  }

  static async create({ name, email, password, roleId = 2 }) {
    // Validate input
    if (!name || !email || !password) {
      throw new Error('Name, email, and password are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    try {
      const result = await pool.query(
        `INSERT INTO Person (name, email, passwordHash, roleId, createdAt) 
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) 
         RETURNING id, name, email, roleId, createdAt`,
        [name, email, passwordHash, roleId]
      );

      return new Person(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  static async findByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM Person WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new Person(result.rows[0]);
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM Person WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new Person(result.rows[0]);
  }

  async validatePassword(password) {
    return bcrypt.compare(password, this.passwordHash);
  }

  toJSON() {
    // Don't expose password hash
    const { passwordHash, ...publicData } = this;
    return publicData;
  }
}

module.exports = Person;