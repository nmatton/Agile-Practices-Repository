const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');
const { requireAuth } = require('../middleware/auth');

// GET /api/activities - List all activities
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const activities = await Activity.findAll({ 
      limit: parseInt(limit), 
      offset: parseInt(offset) 
    });
    
    res.json({
      success: true,
      data: activities,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: activities.length
      }
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activities',
      error: error.message
    });
  }
});

// GET /api/activities/:id - Get activity by ID
router.get('/:id', async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    // Get practice versions that use this activity
    const practiceVersions = await activity.getPracticeVersions();
    
    res.json({
      success: true,
      data: {
        ...activity.toJSON(),
        practiceVersions
      }
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity',
      error: error.message
    });
  }
});

// POST /api/activities - Create new activity (requires authentication)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const activity = await Activity.create({
      name,
      description,
      lastUpdateById: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: activity,
      message: 'Activity created successfully'
    });
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create activity',
      error: error.message
    });
  }
});

// PUT /api/activities/:id - Update activity (requires authentication)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    const { name, description } = req.body;
    
    await activity.update({
      name,
      description,
      lastUpdateById: req.user.id
    });
    
    res.json({
      success: true,
      data: activity,
      message: 'Activity updated successfully'
    });
  } catch (error) {
    console.error('Error updating activity:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update activity',
      error: error.message
    });
  }
});

// DELETE /api/activities/:id - Delete activity (requires authentication)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    const deleted = await activity.delete();
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete activity'
      });
    }
    
    res.json({
      success: true,
      message: 'Activity deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete activity',
      error: error.message
    });
  }
});

module.exports = router;