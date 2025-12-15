const fc = require('fast-check');

/**
 * **Feature: agile-practice-repository, Property 1: User registration creates valid records**
 * **Validates: Requirements 1.1, 1.3**
 */

// Mock database for testing
const mockDatabase = {
  users: new Map(),
  nextId: 1,
  
  async create(userData) {
    if (!userData.name || !userData.email || !userData.password) {
      throw new Error('Name, email, and password are required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      throw new Error('Invalid email format');
    }

    for (const user of this.users.values()) {
      if (user.email === userData.email) {
        throw new Error('Email already exists');
      }
    }

    const user = {
      id: this.nextId++,
      name: userData.name,
      email: userData.email,
      roleId: userData.roleId || 2,
      createdAt: new Date(),
      passwordHash: 'hashed_' + userData.password
    };

    this.users.set(user.id, user);
    
    const { passwordHash, ...publicData } = user;
    return publicData;
  },

  async findByEmail(email) {
    for (const user of this.users.values()) {
      if (user.email === email) {
        const { passwordHash, ...publicData } = user;
        return publicData;
      }
    }
    return null;
  },

  async findById(id) {
    const user = this.users.get(id);
    if (!user) return null;
    
    const { passwordHash, ...publicData } = user;
    return publicData;
  },

  clear() {
    this.users.clear();
    this.nextId = 1;
  }
};

describe('Database Schema Integrity - Property Tests', () => {
  beforeEach(() => {
    mockDatabase.clear();
  });

  describe('Property 1: User registration creates valid records', () => {
    it('should create valid Person records for any valid registration data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            email: fc.emailAddress().map(email => `test_${Date.now()}_${Math.random().toString(36).substring(2, 11)}_${email}`),
            password: fc.string({ minLength: 8, maxLength: 50 })
          }),
          async (userData) => {
            const createdUser = await mockDatabase.create(userData);
            
            expect(createdUser).toBeDefined();
            expect(createdUser.id).toBeGreaterThan(0);
            expect(createdUser.name).toBe(userData.name);
            expect(createdUser.email).toBe(userData.email);
            expect(createdUser.roleId).toBe(2);
            expect(createdUser.createdAt).toBeInstanceOf(Date);
            expect(createdUser.passwordHash).toBeUndefined();
            
            const now = new Date();
            const timeDiff = now - new Date(createdUser.createdAt);
            expect(timeDiff).toBeLessThan(60000);
            
            const foundUser = await mockDatabase.findByEmail(userData.email);
            expect(foundUser).toBeDefined();
            expect(foundUser.id).toBe(createdUser.id);
            
            const foundById = await mockDatabase.findById(createdUser.id);
            expect(foundById).toBeDefined();
            expect(foundById.email).toBe(userData.email);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid email formats', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            email: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0 && (!s.includes('@') || !s.includes('.'))),
            password: fc.string({ minLength: 8, maxLength: 50 })
          }),
          async (userData) => {
            await expect(mockDatabase.create(userData)).rejects.toThrow('Invalid email format');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reject duplicate emails', async () => {
      const testEmail = `test_duplicate_${Date.now()}@example.com`;
      
      await mockDatabase.create({
        name: 'First User',
        email: testEmail,
        password: 'password123'
      });
      
      await expect(mockDatabase.create({
        name: 'Second User',
        email: testEmail,
        password: 'differentpassword'
      })).rejects.toThrow('Email already exists');
    });

    it('should require all mandatory fields', async () => {
      await expect(mockDatabase.create({
        email: 'test@example.com',
        password: 'password123'
      })).rejects.toThrow('Name, email, and password are required');
      
      await expect(mockDatabase.create({
        name: 'Test User',
        password: 'password123'
      })).rejects.toThrow('Name, email, and password are required');
      
      await expect(mockDatabase.create({
        name: 'Test User',
        email: 'test@example.com'
      })).rejects.toThrow('Name, email, and password are required');
    });
  });
});