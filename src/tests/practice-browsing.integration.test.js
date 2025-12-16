const request = require('supertest');
const express = require('express');
const practiceRoutes = require('../routes/practices');

// Mock the database pool
jest.mock('../config/database', () => ({
  query: jest.fn()
}));

const pool = require('../config/database');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/practices', practiceRoutes);

describe('Practice Browsing and Search Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/practices - Enhanced listing with filters', () => {
    it('should handle search parameter', async () => {
      const mockPractices = [
        { id: 1, name: 'Daily Standup', description: 'Daily team meeting', typeId: 1 },
        { id: 2, name: 'Sprint Planning', description: 'Plan the sprint', typeId: 1 }
      ];

      pool.query.mockResolvedValue({ rows: mockPractices });

      const response = await request(app)
        .get('/api/practices?search=daily')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPractices);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(p.name) LIKE LOWER($1) OR LOWER(p.description) LIKE LOWER($1)'),
        expect.arrayContaining(['%daily%'])
      );
    });

    it('should handle goal filtering', async () => {
      const mockPractices = [
        { id: 1, name: 'Daily Standup', description: 'Daily team meeting', typeId: 1 }
      ];

      pool.query.mockResolvedValue({ rows: mockPractices });

      const response = await request(app)
        .get('/api/practices?goalId=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPractices);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('recommendationGoal rg'),
        expect.arrayContaining([1])
      );
    });

    it('should handle type filtering', async () => {
      const mockPractices = [
        { id: 1, name: 'Daily Standup', description: 'Daily team meeting', typeId: 1 }
      ];

      pool.query.mockResolvedValue({ rows: mockPractices });

      const response = await request(app)
        .get('/api/practices?typeId=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPractices);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('p.typeId = $1'),
        expect.arrayContaining([1])
      );
    });

    it('should handle multiple filters combined', async () => {
      const mockPractices = [
        { id: 1, name: 'Daily Standup', description: 'Daily team meeting', typeId: 1 }
      ];

      pool.query.mockResolvedValue({ rows: mockPractices });

      const response = await request(app)
        .get('/api/practices?search=daily&typeId=1&goalId=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPractices);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('p.typeId = $1'),
        expect.arrayContaining([1, 2, '%daily%'])
      );
    });
  });

  describe('GET /api/practices/search - Dedicated search endpoint', () => {
    it('should search practices by query parameter', async () => {
      const mockPractices = [
        { id: 1, name: 'Daily Standup', description: 'Daily team meeting', typeId: 1 }
      ];

      pool.query.mockResolvedValue({ rows: mockPractices });

      const response = await request(app)
        .get('/api/practices/search?q=standup')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPractices);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(p.name) LIKE LOWER($1) OR LOWER(p.description) LIKE LOWER($1)'),
        expect.arrayContaining(['%standup%', 'standup%'])
      );
    });

    it('should return 400 for empty search query', async () => {
      const response = await request(app)
        .get('/api/practices/search?q=')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Search query is required');
    });

    it('should return 400 for missing search query', async () => {
      const response = await request(app)
        .get('/api/practices/search')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Search query is required');
    });
  });

  describe('GET /api/practices/categories - Category browsing', () => {
    it('should return practices grouped by categories', async () => {
      const mockCategories = [
        {
          categoryid: 1,
          categoryname: 'Meetings',
          categorydescription: 'Meeting practices',
          practicecount: '2',
          practices: [
            { id: 1, name: 'Daily Standup', description: 'Daily meeting', objective: 'Communication' },
            { id: 2, name: 'Sprint Planning', description: 'Plan sprint', objective: 'Planning' }
          ]
        }
      ];

      pool.query.mockResolvedValue({ rows: mockCategories });

      const response = await request(app)
        .get('/api/practices/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toEqual({
        categoryId: 1,
        categoryName: 'Meetings',
        categoryDescription: 'Meeting practices',
        practiceCount: 2,
        practices: [
          { id: 1, name: 'Daily Standup', description: 'Daily meeting', objective: 'Communication' },
          { id: 2, name: 'Sprint Planning', description: 'Plan sprint', objective: 'Planning' }
        ]
      });
    });
  });

  describe('GET /api/practices/:id - Enhanced practice details', () => {
    it.skip('should return complete practice details', async () => {
      const mockPracticeData = {
        id: 1,
        name: 'Daily Standup',
        description: 'Daily team meeting',
        objective: 'Communication',
        typeid: 1,
        typename: 'Meeting',
        typedescription: 'Meeting practices'
      };

      const mockVersions = [
        { id: 1, practiceid: 1, universeid: 1, versionname: 'v1.0' }
      ];

      const mockGuidelines = [
        { id: 1, name: 'Scrum Guide', description: 'Official guide', typename: 'Book' }
      ];

      const mockBenefits = [
        { id: 1, name: 'Better Communication', description: 'Improves team communication' }
      ];

      const mockPitfalls = [
        { id: 1, name: 'Too Long', description: 'Meeting runs too long' }
      ];

      const mockActivities = [
        { id: 1, name: 'Check-in', description: 'Team check-in', sequence: 1 }
      ];

      const mockRoles = [
        { id: 1, name: 'Scrum Master', description: 'Facilitates meeting', usetypeid: 1, usetypename: 'Facilitator' }
      ];

      const mockWorkproducts = [
        { id: 1, name: 'Daily Plan', description: 'Plan for the day' }
      ];

      const mockMetrics = [
        { id: 1, name: 'Meeting Duration', unit: 'minutes', scale: '1-30' }
      ];

      const mockRecommendations = [
        { 
          id: 1, 
          description: 'Keep it short', 
          typename: 'Helpful', 
          statusname: 'Active',
          contextdescription: 'Small teams',
          goals: [{ id: 1, name: 'Communication', description: 'Improve communication' }]
        }
      ];

      // Mock the database calls in sequence
      pool.query
        .mockResolvedValueOnce({ rows: [mockPracticeData] }) // Practice with type
        .mockResolvedValueOnce({ rows: mockVersions }) // Versions
        .mockResolvedValueOnce({ rows: mockGuidelines }) // Guidelines
        .mockResolvedValueOnce({ rows: mockBenefits }) // Benefits
        .mockResolvedValueOnce({ rows: mockPitfalls }) // Pitfalls
        .mockResolvedValueOnce({ rows: mockActivities }) // Activities
        .mockResolvedValueOnce({ rows: mockRoles }) // Roles
        .mockResolvedValueOnce({ rows: mockWorkproducts }) // Workproducts
        .mockResolvedValueOnce({ rows: mockMetrics }) // Metrics
        .mockResolvedValueOnce({ rows: mockRecommendations }); // Recommendations

      const response = await request(app)
        .get('/api/practices/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        ...mockPracticeData,
        typeName: 'Meeting',
        typeDescription: 'Meeting practices',
        versions: mockVersions,
        guidelines: mockGuidelines,
        benefits: mockBenefits,
        pitfalls: mockPitfalls,
        activities: mockActivities,
        roles: mockRoles,
        workproducts: mockWorkproducts,
        metrics: mockMetrics,
        recommendations: mockRecommendations,
        goals: [{ id: 1, name: 'Communication', description: 'Improve communication' }]
      });
    });

    it('should return 404 for non-existent practice', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/practices/999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Practice not found');
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      pool.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/practices')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to fetch practices');
    });

    it('should handle search database errors gracefully', async () => {
      pool.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/practices/search?q=test')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to search practices');
    });

    it('should handle categories database errors gracefully', async () => {
      pool.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/practices/categories')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to fetch practice categories');
    });
  });
});