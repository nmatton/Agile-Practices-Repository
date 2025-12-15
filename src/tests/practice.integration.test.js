const Practice = require('../models/Practice');
const PracticeVersion = require('../models/PracticeVersion');
const Method = require('../models/Method');
const MethodVersion = require('../models/MethodVersion');
const Activity = require('../models/Activity');
const pool = require('../config/database');

describe('Practice and Method Integration Tests', () => {
  // Clean up test data after each test
  afterEach(async () => {
    try {
      // Clean up in reverse dependency order to avoid foreign key violations
      await pool.query('DELETE FROM practiceVersionActivity WHERE practiceVersionId IN (SELECT id FROM practiceVersion WHERE versionName LIKE \'Test%\')');
      await pool.query('DELETE FROM practiceMethod WHERE methodVersionId IN (SELECT id FROM methodVersion WHERE versionName LIKE \'Test%\') OR practiceVersionId IN (SELECT id FROM practiceVersion WHERE versionName LIKE \'Test%\')');
      await pool.query('DELETE FROM practiceVersion WHERE versionName LIKE \'Test%\'');
      await pool.query('DELETE FROM methodVersion WHERE versionName LIKE \'Test%\'');
      await pool.query('DELETE FROM Practice WHERE name LIKE \'Test%\'');
      await pool.query('DELETE FROM Method WHERE name LIKE \'Test%\'');
      await pool.query('DELETE FROM Activity WHERE name LIKE \'Test%\'');
    } catch (error) {
      // Ignore cleanup errors in tests
      // console.error('Cleanup error:', error);
    }
  });

  describe('Practice Management', () => {
    it('should create a practice with basic information', async () => {
      const practiceData = {
        name: `Test Daily Standup ${Date.now()}`,
        objective: 'Synchronize team daily',
        description: 'A 15-minute daily meeting',
        typeId: 2
      };

      const practice = await Practice.create(practiceData);

      expect(practice).toBeDefined();
      expect(practice.name).toBe(practiceData.name);
      expect(practice.objective).toBe(practiceData.objective);
      expect(practice.description).toBe(practiceData.description);
      expect(practice.typeId).toBe(practiceData.typeId);
      expect(practice.id).toBeGreaterThan(0);
    });

    it('should create practice versions with draft status', async () => {
      // First create a practice
      const practice = await Practice.create({
        name: `Test TDD Practice ${Date.now()}`,
        objective: 'Write tests first',
        description: 'Test-driven development approach'
      });

      // Create a practice version
      const versionData = {
        practiceId: practice.id,
        universeId: 1, // Global universe from sample data
        versionName: 'Test v1.0',
        changeDescription: 'Initial test version',
        lastUpdateById: 1 // Alice from sample data
      };

      const version = await PracticeVersion.create(versionData);

      expect(version).toBeDefined();
      expect(version.practiceId).toBe(practice.id);
      expect(version.versionName).toBe(versionData.versionName);
      expect(version.status).toBe('Draft');
      expect(version.lastUpdateById).toBe(versionData.lastUpdateById);
    });

    it('should publish practice versions', async () => {
      const practice = await Practice.create({
        name: `Test Retrospective ${Date.now()}`,
        objective: 'Improve team processes'
      });

      const version = await PracticeVersion.create({
        practiceId: practice.id,
        universeId: 1,
        versionName: 'Test v1.0',
        lastUpdateById: 1
      });

      expect(version.status).toBe('Draft');

      await version.publish();
      expect(version.status).toBe('Published');
    });
  });

  describe('Method Management', () => {
    it('should create a method with basic information', async () => {
      const methodData = {
        name: 'Test Scrum Method',
        objective: 'Manage complex product development',
        description: 'Agile framework for teams',
        typeId: 1
      };

      const method = await Method.create(methodData);

      expect(method).toBeDefined();
      expect(method.name).toBe(methodData.name);
      expect(method.objective).toBe(methodData.objective);
      expect(method.description).toBe(methodData.description);
      expect(method.typeId).toBe(methodData.typeId);
    });

    it('should create method versions and link practices', async () => {
      // Create method and practice
      const method = await Method.create({
        name: `Test XP Method ${Date.now()}`,
        objective: 'High quality software'
      });

      const practice = await Practice.create({
        name: `Test Pair Programming ${Date.now()}`,
        objective: 'Improve code quality'
      });

      // Create versions
      const methodVersion = await MethodVersion.create({
        methodId: method.id,
        universeId: 1,
        versionName: 'Test XP v1.0',
        lastUpdateById: 1
      });

      const practiceVersion = await PracticeVersion.create({
        practiceId: practice.id,
        universeId: 1,
        versionName: 'Test PP v1.0',
        lastUpdateById: 1
      });

      // Link practice to method
      await methodVersion.addPractice(practiceVersion.id);

      // Verify the link
      const practices = await methodVersion.getPractices();
      expect(practices).toHaveLength(1);
      expect(practices[0].practicename).toBe(practice.name);
    });
  });

  describe('Activity Management', () => {
    it('should create activities and link to practice versions', async () => {
      // Create activity
      const activity = await Activity.create({
        name: `Test Conduct Meeting ${Date.now()}`,
        description: 'Run the daily standup meeting',
        lastUpdateById: 1
      });

      expect(activity).toBeDefined();
      expect(activity.name).toContain('Test Conduct Meeting');

      // Create practice and version
      const practice = await Practice.create({
        name: `Test Daily Meeting Practice ${Date.now()}`,
        objective: 'Team synchronization'
      });

      const practiceVersion = await PracticeVersion.create({
        practiceId: practice.id,
        universeId: 1,
        versionName: 'Test v1.0',
        lastUpdateById: 1
      });

      // Link activity to practice version
      await practiceVersion.addActivity(activity.id, 1);

      // Verify the link
      const activities = await practiceVersion.getActivities();
      expect(activities).toHaveLength(1);
      expect(activities[0].name).toBe(activity.name);
      expect(activities[0].sequence).toBe(1);
    });
  });

  describe('CRUD Operations', () => {
    it('should support full CRUD lifecycle for practices', async () => {
      // Create
      const practice = await Practice.create({
        name: `Test CRUD Practice ${Date.now()}`,
        objective: 'Test CRUD operations'
      });

      // Read
      const foundPractice = await Practice.findById(practice.id);
      expect(foundPractice.name).toBe(practice.name);

      // Update
      await practice.update({
        objective: 'Updated objective',
        description: 'Added description'
      });
      expect(practice.objective).toBe('Updated objective');
      expect(practice.description).toBe('Added description');

      // Delete
      const deleted = await practice.delete();
      expect(deleted).toBe(true);

      const notFound = await Practice.findById(practice.id);
      expect(notFound).toBeNull();
    });
  });
});