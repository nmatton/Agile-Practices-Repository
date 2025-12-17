const express = require('express');
const router = express.Router();
const Practice = require('../models/Practice');
const PracticeVersion = require('../models/PracticeVersion');
const Activity = require('../models/Activity');
const Goal = require('../models/Goal');
const { requireAuth } = require('../middleware/auth');

// GET /api/practices - List all practices with search and filtering
router.get('/', async (req, res) => {
  try {
    const { 
      typeId, 
      goalId, 
      search, 
      category,
      limit = 20, 
      offset = 0,
      page = 1
    } = req.query;
    
    // Calculate offset from page if provided
    const actualOffset = page ? (parseInt(page) - 1) * parseInt(limit) : parseInt(offset);
    
    const practices = await Practice.findAllWithFilters({ 
      typeId: typeId ? parseInt(typeId) : undefined,
      goalId: goalId ? parseInt(goalId) : undefined,
      search: search || undefined,
      category: category || undefined,
      limit: parseInt(limit), 
      offset: actualOffset 
    });
    
    // Get total count for proper pagination
    const totalCount = await Practice.countWithFilters({
      typeId: typeId ? parseInt(typeId) : undefined,
      goalId: goalId ? parseInt(goalId) : undefined,
      search: search || undefined,
      category: category || undefined,
    });
    
    res.json({
      success: true,
      practices: practices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching practices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch practices',
      error: error.message
    });
  }
});

// GET /api/practices/search - Search practices by name and description
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 50, offset = 0 } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    const practices = await Practice.search(q.trim(), {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      data: practices,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: practices.length
      }
    });
  } catch (error) {
    console.error('Error searching practices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search practices',
      error: error.message
    });
  }
});

// GET /api/practices/goals - Get all goals for filtering
router.get('/goals', async (req, res) => {
  try {
    const goals = await Goal.findAll();
    
    res.json(goals);
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch goals',
      error: error.message
    });
  }
});

// GET /api/practices/categories - Get practices grouped by categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Practice.getByCategories();
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching practice categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch practice categories',
      error: error.message
    });
  }
});

// GET /api/practices/:id - Get practice by ID with complete details
router.get('/:id', async (req, res) => {
  try {
    const practice = await Practice.findById(req.params.id);
    
    if (!practice) {
      return res.status(404).json({
        success: false,
        message: 'Practice not found'
      });
    }

    // Get complete practice details including all associated information
    const practiceDetails = await practice.getCompleteDetails();
    
    res.json({
      success: true,
      data: practiceDetails
    });
  } catch (error) {
    console.error('Error fetching practice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch practice',
      error: error.message
    });
  }
});

// POST /api/practices - Create new practice (requires authentication)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, objective, description, typeId } = req.body;
    
    const practice = await Practice.create({
      name,
      objective,
      description,
      typeId
    });
    
    res.status(201).json({
      success: true,
      data: practice,
      message: 'Practice created successfully'
    });
  } catch (error) {
    console.error('Error creating practice:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(400).json({
      success: false,
      message: 'Failed to create practice',
      error: error.message
    });
  }
});

// PUT /api/practices/:id - Update practice (requires authentication)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const practice = await Practice.findById(req.params.id);
    
    if (!practice) {
      return res.status(404).json({
        success: false,
        message: 'Practice not found'
      });
    }

    const { name, objective, description, typeId } = req.body;
    
    await practice.update({
      name,
      objective,
      description,
      typeId
    });
    
    res.json({
      success: true,
      data: practice,
      message: 'Practice updated successfully'
    });
  } catch (error) {
    console.error('Error updating practice:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update practice',
      error: error.message
    });
  }
});

// DELETE /api/practices/:id - Delete practice (requires authentication)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const practice = await Practice.findById(req.params.id);
    
    if (!practice) {
      return res.status(404).json({
        success: false,
        message: 'Practice not found'
      });
    }

    const deleted = await practice.delete();
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete practice'
      });
    }
    
    res.json({
      success: true,
      message: 'Practice deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting practice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete practice',
      error: error.message
    });
  }
});

// POST /api/practices/:id/versions - Create new practice version
router.post('/:id/versions', requireAuth, async (req, res) => {
  try {
    const practice = await Practice.findById(req.params.id);
    
    if (!practice) {
      return res.status(404).json({
        success: false,
        message: 'Practice not found'
      });
    }

    const { universeId, versionName, changeDescription } = req.body;
    
    const version = await practice.createVersion({
      universeId,
      versionName,
      changeDescription,
      lastUpdateById: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: version,
      message: 'Practice version created successfully'
    });
  } catch (error) {
    console.error('Error creating practice version:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create practice version',
      error: error.message
    });
  }
});

// GET /api/practices/versions/published - Get published practice versions
router.get('/versions/published', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const publishedVersions = await PracticeVersion.findPublished({ 
      limit: parseInt(limit), 
      offset: parseInt(offset) 
    });
    
    res.json({
      success: true,
      data: publishedVersions,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: publishedVersions.length
      }
    });
  } catch (error) {
    console.error('Error fetching published practice versions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch published practice versions',
      error: error.message
    });
  }
});

// PUT /api/practices/versions/:versionId/publish - Publish a practice version
router.put('/versions/:versionId/publish', requireAuth, async (req, res) => {
  try {
    const practiceVersion = await PracticeVersion.findById(req.params.versionId);
    
    if (!practiceVersion) {
      return res.status(404).json({
        success: false,
        message: 'Practice version not found'
      });
    }

    await practiceVersion.publish();
    
    res.json({
      success: true,
      data: practiceVersion,
      message: 'Practice version published successfully'
    });
  } catch (error) {
    console.error('Error publishing practice version:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to publish practice version',
      error: error.message
    });
  }
});

// POST /api/practices/versions/:versionId/activities - Add activity to practice version
router.post('/versions/:versionId/activities', requireAuth, async (req, res) => {
  try {
    const practiceVersion = await PracticeVersion.findById(req.params.versionId);
    
    if (!practiceVersion) {
      return res.status(404).json({
        success: false,
        message: 'Practice version not found'
      });
    }

    const { activityId, sequence } = req.body;
    
    await practiceVersion.addActivity(activityId, sequence);
    
    res.status(201).json({
      success: true,
      message: 'Activity added to practice version successfully'
    });
  } catch (error) {
    console.error('Error adding activity to practice version:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to add activity to practice version',
      error: error.message
    });
  }
});

// GET /api/practices/versions/:versionId/activities - Get activities for practice version
router.get('/versions/:versionId/activities', async (req, res) => {
  try {
    const practiceVersion = await PracticeVersion.findById(req.params.versionId);
    
    if (!practiceVersion) {
      return res.status(404).json({
        success: false,
        message: 'Practice version not found'
      });
    }

    const activities = await practiceVersion.getActivities();
    
    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Error fetching practice version activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch practice version activities',
      error: error.message
    });
  }
});

module.exports = router;