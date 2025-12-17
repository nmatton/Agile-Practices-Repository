const express = require('express');
const router = express.Router();
const { requireAuth, requireExpert } = require('../middleware/auth');
const Practice = require('../models/Practice');
const PracticeVersion = require('../models/PracticeVersion');
const Activity = require('../models/Activity');
const Guideline = require('../models/Guideline');
const Benefit = require('../models/Benefit');
const Pitfall = require('../models/Pitfall');
const Recommendation = require('../models/Recommendation');
const Metric = require('../models/Metric');
const Role = require('../models/Role');
const Workproduct = require('../models/Workproduct');

// All expert routes require authentication and expert role
router.use(requireAuth, requireExpert);

// ============================================================================
// COMPREHENSIVE PRACTICE EDITING INTERFACE
// ============================================================================

// GET /api/expert/practices - Get all practices for expert management
router.get('/practices', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT p.*, 
             COUNT(pv.id) as versionCount,
             MAX(pv.lastUpdate) as lastVersionUpdate,
             CASE 
               WHEN COUNT(pv.id) = 0 THEN 'No Versions'
               ELSE 'Has Versions'
             END as status
      FROM Practice p
      LEFT JOIN practiceVersion pv ON p.id = pv.practiceId
    `;
    
    const params = [];
    
    if (status === 'draft') {
      query += ` WHERE NOT EXISTS (
        SELECT 1 FROM practiceVersion pv2 
        WHERE pv2.practiceId = p.id
      )`;
    } else if (status === 'published') {
      query += ` WHERE EXISTS (
        SELECT 1 FROM practiceVersion pv2 
        WHERE pv2.practiceId = p.id
      )`;
    }
    
    query += ` 
      GROUP BY p.id, p.name, p.objective, p.description, p.typeId
      ORDER BY p.name 
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);
    
    const pool = require('../config/database');
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        objective: row.objective,
        description: row.description,
        typeId: row.typeid,
        versionCount: parseInt(row.versioncount),
        lastVersionUpdate: row.lastversionupdate,
        status: row.status
      })),
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: result.rows.length
      }
    });
  } catch (error) {
    console.error('Error fetching expert practices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch practices',
      error: error.message
    });
  }
});

// GET /api/expert/practices/:id/edit - Get practice with all editable components
router.get('/practices/:id/edit', async (req, res) => {
  try {
    const practice = await Practice.findById(req.params.id);
    
    if (!practice) {
      return res.status(404).json({
        success: false,
        message: 'Practice not found'
      });
    }

    // Get complete practice details including all associated components
    const practiceDetails = await practice.getCompleteDetails();
    
    // Get available options for dropdowns
    const pool = require('../config/database');
    
    // Get practice types
    const typesResult = await pool.query('SELECT * FROM practiceType ORDER BY name');
    const practiceTypes = typesResult.rows;
    
    // Get guideline types
    const guidelineTypesResult = await pool.query('SELECT * FROM guidelineType ORDER BY name');
    const guidelineTypes = guidelineTypesResult.rows;
    
    // Get recommendation types and statuses
    const recTypesResult = await pool.query('SELECT * FROM recommendationType ORDER BY name');
    const recommendationTypes = recTypesResult.rows;
    
    const recStatusResult = await pool.query('SELECT * FROM recommendationStatus ORDER BY name');
    const recommendationStatuses = recStatusResult.rows;
    
    // Get contexts
    const contextsResult = await pool.query('SELECT * FROM Context ORDER BY description');
    const contexts = contextsResult.rows;
    
    // Get goals
    const goalsResult = await pool.query('SELECT * FROM Goal ORDER BY name');
    const goals = goalsResult.rows;
    
    // Get role use types
    const roleUseTypesResult = await pool.query('SELECT * FROM roleUseType ORDER BY name');
    const roleUseTypes = roleUseTypesResult.rows;
    
    res.json({
      success: true,
      data: {
        practice: practiceDetails,
        options: {
          practiceTypes,
          guidelineTypes,
          recommendationTypes,
          recommendationStatuses,
          contexts,
          goals,
          roleUseTypes
        }
      }
    });
  } catch (error) {
    console.error('Error fetching practice for editing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch practice for editing',
      error: error.message
    });
  }
});

// PUT /api/expert/practices/:id - Update practice with comprehensive data
router.put('/practices/:id', async (req, res) => {
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

// ============================================================================
// ACTIVITY SEQUENCING AND MANAGEMENT SYSTEM
// ============================================================================

// GET /api/expert/practices/:id/versions/:versionId/activities - Get activities with sequencing
router.get('/practices/:id/versions/:versionId/activities', async (req, res) => {
  try {
    const practiceVersion = await PracticeVersion.findById(req.params.versionId);
    
    if (!practiceVersion) {
      return res.status(404).json({
        success: false,
        message: 'Practice version not found'
      });
    }

    const activities = await practiceVersion.getActivities();
    
    // Get all available activities for adding
    const allActivities = await Activity.findAll();
    
    res.json({
      success: true,
      data: {
        practiceVersionActivities: activities,
        availableActivities: allActivities
      }
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

// POST /api/expert/practices/:id/versions/:versionId/activities - Add activity with sequence
router.post('/practices/:id/versions/:versionId/activities', async (req, res) => {
  try {
    const practiceVersion = await PracticeVersion.findById(req.params.versionId);
    
    if (!practiceVersion) {
      return res.status(404).json({
        success: false,
        message: 'Practice version not found'
      });
    }

    const { activityId, sequence } = req.body;
    
    if (!activityId || sequence === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Activity ID and sequence are required'
      });
    }
    
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

// PUT /api/expert/practices/:id/versions/:versionId/activities/:activityId/sequence - Update activity sequence
router.put('/practices/:id/versions/:versionId/activities/:activityId/sequence', async (req, res) => {
  try {
    const practiceVersion = await PracticeVersion.findById(req.params.versionId);
    
    if (!practiceVersion) {
      return res.status(404).json({
        success: false,
        message: 'Practice version not found'
      });
    }

    const { sequence } = req.body;
    
    if (sequence === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Sequence is required'
      });
    }
    
    const updated = await practiceVersion.updateActivitySequence(req.params.activityId, sequence);
    
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found in practice version'
      });
    }
    
    res.json({
      success: true,
      message: 'Activity sequence updated successfully'
    });
  } catch (error) {
    console.error('Error updating activity sequence:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update activity sequence',
      error: error.message
    });
  }
});

// DELETE /api/expert/practices/:id/versions/:versionId/activities/:activityId - Remove activity
router.delete('/practices/:id/versions/:versionId/activities/:activityId', async (req, res) => {
  try {
    const practiceVersion = await PracticeVersion.findById(req.params.versionId);
    
    if (!practiceVersion) {
      return res.status(404).json({
        success: false,
        message: 'Practice version not found'
      });
    }

    const removed = await practiceVersion.removeActivity(req.params.activityId);
    
    if (!removed) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found in practice version'
      });
    }
    
    res.json({
      success: true,
      message: 'Activity removed from practice version successfully'
    });
  } catch (error) {
    console.error('Error removing activity from practice version:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove activity from practice version',
      error: error.message
    });
  }
});

// POST /api/expert/activities - Create new activity
router.post('/activities', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Activity name is required'
      });
    }
    
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

// ============================================================================
// RESOURCE LINKING AND METADATA MANAGEMENT
// ============================================================================

// POST /api/expert/practices/:id/versions/:versionId/guidelines - Add guideline
router.post('/practices/:id/versions/:versionId/guidelines', async (req, res) => {
  try {
    const { name, description, content, typeId } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Guideline name is required'
      });
    }
    
    const guideline = await Guideline.create({
      practiceVersionId: req.params.versionId,
      name,
      description,
      content,
      typeId,
      lastUpdateById: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: guideline,
      message: 'Guideline created successfully'
    });
  } catch (error) {
    console.error('Error creating guideline:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create guideline',
      error: error.message
    });
  }
});

// PUT /api/expert/guidelines/:id - Update guideline
router.put('/guidelines/:id', async (req, res) => {
  try {
    const guideline = await Guideline.findById(req.params.id);
    
    if (!guideline) {
      return res.status(404).json({
        success: false,
        message: 'Guideline not found'
      });
    }

    const { name, description, content, typeId } = req.body;
    
    await guideline.update({
      name,
      description,
      content,
      typeId,
      lastUpdateById: req.user.id
    });
    
    res.json({
      success: true,
      data: guideline,
      message: 'Guideline updated successfully'
    });
  } catch (error) {
    console.error('Error updating guideline:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update guideline',
      error: error.message
    });
  }
});

// DELETE /api/expert/guidelines/:id - Delete guideline
router.delete('/guidelines/:id', async (req, res) => {
  try {
    const guideline = await Guideline.findById(req.params.id);
    
    if (!guideline) {
      return res.status(404).json({
        success: false,
        message: 'Guideline not found'
      });
    }

    const deleted = await guideline.delete();
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete guideline'
      });
    }
    
    res.json({
      success: true,
      message: 'Guideline deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting guideline:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete guideline',
      error: error.message
    });
  }
});

// POST /api/expert/practices/:id/versions/:versionId/benefits - Add benefit
router.post('/practices/:id/versions/:versionId/benefits', async (req, res) => {
  try {
    const { name, description, content } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Benefit name is required'
      });
    }
    
    const benefit = await Benefit.create({
      practiceVersionId: req.params.versionId,
      name,
      description,
      content,
      lastUpdateById: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: benefit,
      message: 'Benefit created successfully'
    });
  } catch (error) {
    console.error('Error creating benefit:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create benefit',
      error: error.message
    });
  }
});

// PUT /api/expert/benefits/:id - Update benefit
router.put('/benefits/:id', async (req, res) => {
  try {
    const benefit = await Benefit.findById(req.params.id);
    
    if (!benefit) {
      return res.status(404).json({
        success: false,
        message: 'Benefit not found'
      });
    }

    const { name, description, content } = req.body;
    
    await benefit.update({
      name,
      description,
      content,
      lastUpdateById: req.user.id
    });
    
    res.json({
      success: true,
      data: benefit,
      message: 'Benefit updated successfully'
    });
  } catch (error) {
    console.error('Error updating benefit:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update benefit',
      error: error.message
    });
  }
});

// DELETE /api/expert/benefits/:id - Delete benefit
router.delete('/benefits/:id', async (req, res) => {
  try {
    const benefit = await Benefit.findById(req.params.id);
    
    if (!benefit) {
      return res.status(404).json({
        success: false,
        message: 'Benefit not found'
      });
    }

    const deleted = await benefit.delete();
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete benefit'
      });
    }
    
    res.json({
      success: true,
      message: 'Benefit deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting benefit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete benefit',
      error: error.message
    });
  }
});

// POST /api/expert/practices/:id/versions/:versionId/pitfalls - Add pitfall
router.post('/practices/:id/versions/:versionId/pitfalls', async (req, res) => {
  try {
    const { name, description, content } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Pitfall name is required'
      });
    }
    
    const pitfall = await Pitfall.create({
      practiceVersionId: req.params.versionId,
      name,
      description,
      content,
      lastUpdateById: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: pitfall,
      message: 'Pitfall created successfully'
    });
  } catch (error) {
    console.error('Error creating pitfall:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create pitfall',
      error: error.message
    });
  }
});

// PUT /api/expert/pitfalls/:id - Update pitfall
router.put('/pitfalls/:id', async (req, res) => {
  try {
    const pitfall = await Pitfall.findById(req.params.id);
    
    if (!pitfall) {
      return res.status(404).json({
        success: false,
        message: 'Pitfall not found'
      });
    }

    const { name, description, content } = req.body;
    
    await pitfall.update({
      name,
      description,
      content,
      lastUpdateById: req.user.id
    });
    
    res.json({
      success: true,
      data: pitfall,
      message: 'Pitfall updated successfully'
    });
  } catch (error) {
    console.error('Error updating pitfall:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update pitfall',
      error: error.message
    });
  }
});

// DELETE /api/expert/pitfalls/:id - Delete pitfall
router.delete('/pitfalls/:id', async (req, res) => {
  try {
    const pitfall = await Pitfall.findById(req.params.id);
    
    if (!pitfall) {
      return res.status(404).json({
        success: false,
        message: 'Pitfall not found'
      });
    }

    const deleted = await pitfall.delete();
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete pitfall'
      });
    }
    
    res.json({
      success: true,
      message: 'Pitfall deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting pitfall:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete pitfall',
      error: error.message
    });
  }
});

// POST /api/expert/practices/:id/versions/:versionId/recommendations - Add recommendation
router.post('/practices/:id/versions/:versionId/recommendations', async (req, res) => {
  try {
    const { description, typeId, statusId, contextId, goalIds } = req.body;
    
    if (!description) {
      return res.status(400).json({
        success: false,
        message: 'Recommendation description is required'
      });
    }
    
    const recommendation = await Recommendation.create({
      practiceVersionId: req.params.versionId,
      description,
      typeId,
      statusId,
      contextId,
      lastUpdateById: req.user.id
    });
    
    // Link to goals if provided
    if (goalIds && Array.isArray(goalIds) && goalIds.length > 0) {
      await recommendation.linkToGoals(goalIds);
    }
    
    res.status(201).json({
      success: true,
      data: recommendation,
      message: 'Recommendation created successfully'
    });
  } catch (error) {
    console.error('Error creating recommendation:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create recommendation',
      error: error.message
    });
  }
});

// PUT /api/expert/recommendations/:id - Update recommendation
router.put('/recommendations/:id', async (req, res) => {
  try {
    const recommendation = await Recommendation.findById(req.params.id);
    
    if (!recommendation) {
      return res.status(404).json({
        success: false,
        message: 'Recommendation not found'
      });
    }

    const { description, typeId, statusId, contextId, goalIds } = req.body;
    
    await recommendation.update({
      description,
      typeId,
      statusId,
      contextId,
      lastUpdateById: req.user.id
    });
    
    // Update goal links if provided
    if (goalIds && Array.isArray(goalIds)) {
      await recommendation.linkToGoals(goalIds);
    }
    
    res.json({
      success: true,
      data: recommendation,
      message: 'Recommendation updated successfully'
    });
  } catch (error) {
    console.error('Error updating recommendation:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update recommendation',
      error: error.message
    });
  }
});

// DELETE /api/expert/recommendations/:id - Delete recommendation
router.delete('/recommendations/:id', async (req, res) => {
  try {
    const recommendation = await Recommendation.findById(req.params.id);
    
    if (!recommendation) {
      return res.status(404).json({
        success: false,
        message: 'Recommendation not found'
      });
    }

    const deleted = await recommendation.delete();
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete recommendation'
      });
    }
    
    res.json({
      success: true,
      message: 'Recommendation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting recommendation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete recommendation',
      error: error.message
    });
  }
});

module.exports = router;
// ============================================================================
// METRIC DEFINITION AND PRACTICE ASSOCIATION TOOLS
// ============================================================================

// GET /api/expert/metrics - Get all metrics for management
router.get('/metrics', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const metrics = await Metric.findAll({ limit: parseInt(limit), offset: parseInt(offset) });
    
    res.json({
      success: true,
      data: metrics,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: metrics.length
      }
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch metrics',
      error: error.message
    });
  }
});

// POST /api/expert/metrics - Create new metric
router.post('/metrics', async (req, res) => {
  try {
    const { name, unit, scale, formula } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Metric name is required'
      });
    }
    
    const metric = await Metric.create({
      name,
      unit,
      scale,
      formula,
      lastUpdateById: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: metric,
      message: 'Metric created successfully'
    });
  } catch (error) {
    console.error('Error creating metric:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create metric',
      error: error.message
    });
  }
});

// PUT /api/expert/metrics/:id - Update metric
router.put('/metrics/:id', async (req, res) => {
  try {
    const metric = await Metric.findById(req.params.id);
    
    if (!metric) {
      return res.status(404).json({
        success: false,
        message: 'Metric not found'
      });
    }

    const { name, unit, scale, formula } = req.body;
    
    await metric.update({
      name,
      unit,
      scale,
      formula,
      lastUpdateById: req.user.id
    });
    
    res.json({
      success: true,
      data: metric,
      message: 'Metric updated successfully'
    });
  } catch (error) {
    console.error('Error updating metric:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update metric',
      error: error.message
    });
  }
});

// DELETE /api/expert/metrics/:id - Delete metric
router.delete('/metrics/:id', async (req, res) => {
  try {
    const metric = await Metric.findById(req.params.id);
    
    if (!metric) {
      return res.status(404).json({
        success: false,
        message: 'Metric not found'
      });
    }

    const deleted = await metric.delete();
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete metric'
      });
    }
    
    res.json({
      success: true,
      message: 'Metric deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting metric:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete metric',
      error: error.message
    });
  }
});

// POST /api/expert/metrics/:id/practices - Associate metric with practice versions
router.post('/metrics/:id/practices', async (req, res) => {
  try {
    const metric = await Metric.findById(req.params.id);
    
    if (!metric) {
      return res.status(404).json({
        success: false,
        message: 'Metric not found'
      });
    }

    const { practiceVersionIds } = req.body;
    
    if (!Array.isArray(practiceVersionIds)) {
      return res.status(400).json({
        success: false,
        message: 'Practice version IDs must be an array'
      });
    }
    
    await metric.linkToPracticeVersions(practiceVersionIds);
    
    res.json({
      success: true,
      message: 'Metric associated with practice versions successfully'
    });
  } catch (error) {
    console.error('Error associating metric with practices:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to associate metric with practices',
      error: error.message
    });
  }
});

// GET /api/expert/metrics/:id/practices - Get practice versions associated with metric
router.get('/metrics/:id/practices', async (req, res) => {
  try {
    const metric = await Metric.findById(req.params.id);
    
    if (!metric) {
      return res.status(404).json({
        success: false,
        message: 'Metric not found'
      });
    }

    const practiceVersions = await metric.getPracticeVersions();
    
    res.json({
      success: true,
      data: practiceVersions
    });
  } catch (error) {
    console.error('Error fetching metric practice associations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch metric practice associations',
      error: error.message
    });
  }
});

// ============================================================================
// ROLE USAGE SPECIFICATION IN PRACTICES
// ============================================================================

// GET /api/expert/roles - Get all roles for management
router.get('/roles', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const roles = await Role.findAll({ limit: parseInt(limit), offset: parseInt(offset) });
    
    res.json({
      success: true,
      data: roles,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: roles.length
      }
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch roles',
      error: error.message
    });
  }
});

// POST /api/expert/roles - Create new role
router.post('/roles', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Role name is required'
      });
    }
    
    const role = await Role.create({
      name,
      description,
      lastUpdateById: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: role,
      message: 'Role created successfully'
    });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create role',
      error: error.message
    });
  }
});

// PUT /api/expert/roles/:id - Update role
router.put('/roles/:id', async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    const { name, description } = req.body;
    
    await role.update({
      name,
      description,
      lastUpdateById: req.user.id
    });
    
    res.json({
      success: true,
      data: role,
      message: 'Role updated successfully'
    });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update role',
      error: error.message
    });
  }
});

// DELETE /api/expert/roles/:id - Delete role
router.delete('/roles/:id', async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    const deleted = await role.delete();
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete role'
      });
    }
    
    res.json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete role',
      error: error.message
    });
  }
});

// POST /api/expert/practices/:id/versions/:versionId/roles/:roleId - Associate role with practice version
router.post('/practices/:id/versions/:versionId/roles/:roleId', async (req, res) => {
  try {
    const role = await Role.findById(req.params.roleId);
    
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    const { typeId } = req.body;
    
    const association = await role.linkToPracticeVersion(req.params.versionId, typeId);
    
    res.status(201).json({
      success: true,
      data: association,
      message: 'Role associated with practice version successfully'
    });
  } catch (error) {
    console.error('Error associating role with practice version:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to associate role with practice version',
      error: error.message
    });
  }
});

// DELETE /api/expert/practices/:id/versions/:versionId/roles/:roleId - Remove role from practice version
router.delete('/practices/:id/versions/:versionId/roles/:roleId', async (req, res) => {
  try {
    const role = await Role.findById(req.params.roleId);
    
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    const removed = await role.unlinkFromPracticeVersion(req.params.versionId);
    
    if (!removed) {
      return res.status(404).json({
        success: false,
        message: 'Role not associated with this practice version'
      });
    }
    
    res.json({
      success: true,
      message: 'Role removed from practice version successfully'
    });
  } catch (error) {
    console.error('Error removing role from practice version:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove role from practice version',
      error: error.message
    });
  }
});

// GET /api/expert/roles/:id/practices - Get practice versions associated with role
router.get('/roles/:id/practices', async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    const practiceVersions = await role.getPracticeVersions();
    
    res.json({
      success: true,
      data: practiceVersions
    });
  } catch (error) {
    console.error('Error fetching role practice associations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch role practice associations',
      error: error.message
    });
  }
});

// ============================================================================
// WORKPRODUCT MANAGEMENT
// ============================================================================

// GET /api/expert/workproducts - Get all workproducts for management
router.get('/workproducts', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const workproducts = await Workproduct.findAll({ limit: parseInt(limit), offset: parseInt(offset) });
    
    res.json({
      success: true,
      data: workproducts,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: workproducts.length
      }
    });
  } catch (error) {
    console.error('Error fetching workproducts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workproducts',
      error: error.message
    });
  }
});

// POST /api/expert/workproducts - Create new workproduct
router.post('/workproducts', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Workproduct name is required'
      });
    }
    
    const workproduct = await Workproduct.create({
      name,
      description,
      lastUpdateById: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: workproduct,
      message: 'Workproduct created successfully'
    });
  } catch (error) {
    console.error('Error creating workproduct:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create workproduct',
      error: error.message
    });
  }
});

// PUT /api/expert/workproducts/:id - Update workproduct
router.put('/workproducts/:id', async (req, res) => {
  try {
    const workproduct = await Workproduct.findById(req.params.id);
    
    if (!workproduct) {
      return res.status(404).json({
        success: false,
        message: 'Workproduct not found'
      });
    }

    const { name, description } = req.body;
    
    await workproduct.update({
      name,
      description,
      lastUpdateById: req.user.id
    });
    
    res.json({
      success: true,
      data: workproduct,
      message: 'Workproduct updated successfully'
    });
  } catch (error) {
    console.error('Error updating workproduct:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update workproduct',
      error: error.message
    });
  }
});

// DELETE /api/expert/workproducts/:id - Delete workproduct
router.delete('/workproducts/:id', async (req, res) => {
  try {
    const workproduct = await Workproduct.findById(req.params.id);
    
    if (!workproduct) {
      return res.status(404).json({
        success: false,
        message: 'Workproduct not found'
      });
    }

    const deleted = await workproduct.delete();
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete workproduct'
      });
    }
    
    res.json({
      success: true,
      message: 'Workproduct deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting workproduct:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete workproduct',
      error: error.message
    });
  }
});

// POST /api/expert/workproducts/:id/practices - Associate workproduct with practice versions
router.post('/workproducts/:id/practices', async (req, res) => {
  try {
    const workproduct = await Workproduct.findById(req.params.id);
    
    if (!workproduct) {
      return res.status(404).json({
        success: false,
        message: 'Workproduct not found'
      });
    }

    const { practiceVersionIds } = req.body;
    
    if (!Array.isArray(practiceVersionIds)) {
      return res.status(400).json({
        success: false,
        message: 'Practice version IDs must be an array'
      });
    }
    
    await workproduct.linkToPracticeVersions(practiceVersionIds);
    
    res.json({
      success: true,
      message: 'Workproduct associated with practice versions successfully'
    });
  } catch (error) {
    console.error('Error associating workproduct with practices:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to associate workproduct with practices',
      error: error.message
    });
  }
});

// GET /api/expert/workproducts/:id/practices - Get practice versions associated with workproduct
router.get('/workproducts/:id/practices', async (req, res) => {
  try {
    const workproduct = await Workproduct.findById(req.params.id);
    
    if (!workproduct) {
      return res.status(404).json({
        success: false,
        message: 'Workproduct not found'
      });
    }

    const practiceVersions = await workproduct.getPracticeVersions();
    
    res.json({
      success: true,
      data: practiceVersions
    });
  } catch (error) {
    console.error('Error fetching workproduct practice associations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workproduct practice associations',
      error: error.message
    });
  }
});

// ============================================================================
// PRACTICE STATUS MANAGEMENT
// ============================================================================

// PUT /api/expert/practices/:id/versions/:versionId/publish - Publish practice version
router.put('/practices/:id/versions/:versionId/publish', async (req, res) => {
  try {
    const practiceVersion = await PracticeVersion.findById(req.params.versionId);
    
    if (!practiceVersion) {
      return res.status(404).json({
        success: false,
        message: 'Practice version not found'
      });
    }

    // Validate that all required fields are completed before publishing
    const practice = await Practice.findById(req.params.id);
    if (!practice.name || !practice.description) {
      return res.status(400).json({
        success: false,
        message: 'Practice must have name and description before publishing'
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

// GET /api/expert/dashboard - Get expert dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const pool = require('../config/database');
    
    // Get practice statistics
    const practiceStatsResult = await pool.query(`
      SELECT 
        COUNT(*) as totalPractices,
        COUNT(CASE WHEN EXISTS (SELECT 1 FROM practiceVersion pv WHERE pv.practiceId = p.id) THEN 1 END) as publishedPractices,
        COUNT(CASE WHEN NOT EXISTS (SELECT 1 FROM practiceVersion pv WHERE pv.practiceId = p.id) THEN 1 END) as draftPractices
      FROM Practice p
    `);
    
    // Get recent activity
    const recentActivityResult = await pool.query(`
      SELECT 
        'practice' as type,
        p.name as title,
        p.id as entityId,
        NULL as versionId,
        'Created practice' as action,
        p.name as description,
        CURRENT_TIMESTAMP as timestamp
      FROM Practice p
      ORDER BY p.id DESC
      LIMIT 10
    `);
    
    // Get content statistics
    const contentStatsResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM Activity) as totalActivities,
        (SELECT COUNT(*) FROM Guideline) as totalGuidelines,
        (SELECT COUNT(*) FROM Benefit) as totalBenefits,
        (SELECT COUNT(*) FROM Pitfall) as totalPitfalls,
        (SELECT COUNT(*) FROM Recommendation) as totalRecommendations,
        (SELECT COUNT(*) FROM Metric) as totalMetrics,
        (SELECT COUNT(*) FROM Role) as totalRoles,
        (SELECT COUNT(*) FROM Workproduct) as totalWorkproducts
    `);
    
    const practiceStats = practiceStatsResult.rows[0];
    const recentActivity = recentActivityResult.rows;
    const contentStats = contentStatsResult.rows[0];
    
    res.json({
      success: true,
      data: {
        practiceStats: {
          total: parseInt(practiceStats.totalpractices),
          published: parseInt(practiceStats.publishedpractices),
          draft: parseInt(practiceStats.draftpractices)
        },
        contentStats: {
          activities: parseInt(contentStats.totalactivities),
          guidelines: parseInt(contentStats.totalguidelines),
          benefits: parseInt(contentStats.totalbenefits),
          pitfalls: parseInt(contentStats.totalpitfalls),
          recommendations: parseInt(contentStats.totalrecommendations),
          metrics: parseInt(contentStats.totalmetrics),
          roles: parseInt(contentStats.totalroles),
          workproducts: parseInt(contentStats.totalworkproducts)
        },
        recentActivity
      }
    });
  } catch (error) {
    console.error('Error fetching expert dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expert dashboard',
      error: error.message
    });
  }
});