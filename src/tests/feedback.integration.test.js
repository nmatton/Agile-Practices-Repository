const request = require('supertest');
const app = require('../server');
const pool = require('../config/database');

describe('Experience Feedback Integration Tests', () => {
  let testUser, expertUser, testPracticeVersion;

  beforeAll(async () => {
    // Create test users
    const userResult = await pool.query(
      `INSERT INTO Person (name, email, passwordHash, roleId) 
       VALUES ('Test User', 'testuser@test.com', 'hashedpassword', 2) 
       RETURNING id, name, email, roleId`
    );
    testUser = userResult.rows[0];

    const expertResult = await pool.query(
      `INSERT INTO Person (name, email, passwordHash, roleId) 
       VALUES ('Test Expert', 'expert@test.com', 'hashedpassword', 1) 
       RETURNING id, name, email, roleId`
    );
    expertUser = expertResult.rows[0];

    // Get a test practice version
    const practiceVersionResult = await pool.query(
      'SELECT id FROM practiceVersion LIMIT 1'
    );
    testPracticeVersion = practiceVersionResult.rows[0];
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM ExperienceFeedback WHERE personId IN ($1, $2)', [testUser.id, expertUser.id]);
    await pool.query('DELETE FROM Person WHERE id IN ($1, $2)', [testUser.id, expertUser.id]);
  });

  describe('POST /api/feedback', () => {
    it('should create feedback when authenticated', async () => {
      const agent = request.agent(app);
      
      // Mock authentication by setting session
      await agent
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'password' })
        .expect(200);

      const feedbackData = {
        practiceVersionId: testPracticeVersion.id,
        projectContext: 'Test project context',
        feedbackText: 'This is a test feedback',
        rating: 4
      };

      const response = await agent
        .post('/api/feedback')
        .send(feedbackData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.feedbackText).toBe(feedbackData.feedbackText);
      expect(response.body.rating).toBe(feedbackData.rating);
      expect(response.body.isValidated).toBe(false);
      expect(response.body.authorName).toBe(testUser.name);
    });

    it('should reject feedback without authentication', async () => {
      const feedbackData = {
        practiceVersionId: testPracticeVersion.id,
        feedbackText: 'This should fail',
        rating: 3
      };

      await request(app)
        .post('/api/feedback')
        .send(feedbackData)
        .expect(401);
    });

    it('should validate required fields', async () => {
      const agent = request.agent(app);
      
      // Mock authentication
      await agent
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'password' })
        .expect(200);

      // Missing feedbackText
      await agent
        .post('/api/feedback')
        .send({ practiceVersionId: testPracticeVersion.id })
        .expect(400);

      // Invalid rating
      await agent
        .post('/api/feedback')
        .send({ 
          practiceVersionId: testPracticeVersion.id,
          feedbackText: 'Test',
          rating: 6 
        })
        .expect(400);
    });
  });

  describe('GET /api/feedback/practice/:practiceVersionId', () => {
    let testFeedback;

    beforeAll(async () => {
      // Create test feedback
      const result = await pool.query(
        `INSERT INTO ExperienceFeedback (practiceVersionId, personId, feedbackText, rating, isValidated) 
         VALUES ($1, $2, 'Test validated feedback', 5, true) 
         RETURNING id`,
        [testPracticeVersion.id, testUser.id]
      );
      testFeedback = result.rows[0];
    });

    afterAll(async () => {
      await pool.query('DELETE FROM ExperienceFeedback WHERE id = $1', [testFeedback.id]);
    });

    it('should return validated feedback for practice version', async () => {
      const response = await request(app)
        .get(`/api/feedback/practice/${testPracticeVersion.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('feedback');
      expect(response.body).toHaveProperty('stats');
      expect(Array.isArray(response.body.feedback)).toBe(true);
      
      // Should only show validated feedback to unauthenticated users
      const validatedFeedback = response.body.feedback.filter(f => f.isValidated);
      expect(validatedFeedback.length).toBeGreaterThan(0);
    });

    it('should return feedback statistics', async () => {
      const response = await request(app)
        .get(`/api/feedback/practice/${testPracticeVersion.id}/stats`)
        .expect(200);

      expect(response.body).toHaveProperty('totalFeedback');
      expect(response.body).toHaveProperty('validatedFeedback');
      expect(response.body).toHaveProperty('averageRating');
      expect(response.body).toHaveProperty('ratedFeedback');
    });
  });

  describe('Feedback Moderation', () => {
    let unvalidatedFeedback;

    beforeAll(async () => {
      // Create unvalidated feedback
      const result = await pool.query(
        `INSERT INTO ExperienceFeedback (practiceVersionId, personId, feedbackText, rating, isValidated) 
         VALUES ($1, $2, 'Unvalidated test feedback', 3, false) 
         RETURNING id`,
        [testPracticeVersion.id, testUser.id]
      );
      unvalidatedFeedback = result.rows[0];
    });

    afterAll(async () => {
      await pool.query('DELETE FROM ExperienceFeedback WHERE id = $1', [unvalidatedFeedback.id]);
    });

    it('should allow experts to validate feedback', async () => {
      const agent = request.agent(app);
      
      // Mock expert authentication
      await agent
        .post('/api/auth/login')
        .send({ email: expertUser.email, password: 'password' })
        .expect(200);

      const response = await agent
        .post(`/api/feedback/${unvalidatedFeedback.id}/validate`)
        .expect(200);

      expect(response.body.isValidated).toBe(true);
      expect(response.body.validatedBy).toBe(expertUser.id);
      expect(response.body.validatorName).toBe(expertUser.name);
    });

    it('should not allow non-experts to validate feedback', async () => {
      const agent = request.agent(app);
      
      // Mock regular user authentication
      await agent
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'password' })
        .expect(200);

      await agent
        .post(`/api/feedback/${unvalidatedFeedback.id}/validate`)
        .expect(403);
    });

    it('should allow experts to view pending feedback', async () => {
      const agent = request.agent(app);
      
      // Mock expert authentication
      await agent
        .post('/api/auth/login')
        .send({ email: expertUser.email, password: 'password' })
        .expect(200);

      const response = await agent
        .get('/api/feedback/pending')
        .expect(200);

      expect(response.body).toHaveProperty('feedback');
      expect(Array.isArray(response.body.feedback)).toBe(true);
    });
  });

  describe('Practice Details Integration', () => {
    it('should include feedback in practice complete details', async () => {
      // Get practice ID from practice version
      const practiceResult = await pool.query(
        'SELECT practiceId FROM practiceVersion WHERE id = $1',
        [testPracticeVersion.id]
      );
      const practiceId = practiceResult.rows[0].practiceid;

      const response = await request(app)
        .get(`/api/practices/${practiceId}/details`)
        .expect(200);

      expect(response.body).toHaveProperty('feedback');
      expect(response.body).toHaveProperty('feedbackStats');
      expect(Array.isArray(response.body.feedback)).toBe(true);
      
      if (response.body.feedbackStats) {
        expect(response.body.feedbackStats).toHaveProperty('totalFeedback');
        expect(response.body.feedbackStats).toHaveProperty('validatedFeedback');
        expect(response.body.feedbackStats).toHaveProperty('averageRating');
      }
    });
  });
});