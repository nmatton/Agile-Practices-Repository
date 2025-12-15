const express = require('express');
const router = express.Router();
const Method = require('../models/Method');
const MethodVersion = require('../models/MethodVersion');
const { requireAuth } = require('../middleware/auth');

// GET /api/methods - List all methods
router.get('/', async (req, res) => {
  try {
    const { typeId, limit = 50, offset = 0 } = req.query;
    const methods = await Method.findAll({ 
      typeId: typeId ? parseInt(typeId) : undefined,
      limit: parseInt(limit), 
      offset: parseInt(offset) 
    });
    
    res.json({
      success: true,
      data: methods,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: methods.length
      }
    });
  } catch (error) {
    console.error('Error fetching methods:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch methods',
      error: error.message
    });
  }
});

// GET /api/methods/:id - Get method by ID
router.get('/:id', async (req, res) => {
  try {
    const method = await Method.findById(req.params.id);
    
    if (!method) {
      return res.status(404).json({
        success: false,
        message: 'Method not found'
      });
    }

    // Get versions for this method
    const versions = await method.getVersions();
    
    res.json({
      success: true,
      data: {
        ...method.toJSON(),
        versions
      }
    });
  } catch (error) {
    console.error('Error fetching method:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch method',
      error: error.message
    });
  }
});

// POST /api/methods - Create new method (requires authentication)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, objective, description, typeId } = req.body;
    
    const method = await Method.create({
      name,
      objective,
      description,
      typeId
    });
    
    res.status(201).json({
      success: true,
      data: method,
      message: 'Method created successfully'
    });
  } catch (error) {
    console.error('Error creating method:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create method',
      error: error.message
    });
  }
});

// PUT /api/methods/:id - Update method (requires authentication)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const method = await Method.findById(req.params.id);
    
    if (!method) {
      return res.status(404).json({
        success: false,
        message: 'Method not found'
      });
    }

    const { name, objective, description, typeId } = req.body;
    
    await method.update({
      name,
      objective,
      description,
      typeId
    });
    
    res.json({
      success: true,
      data: method,
      message: 'Method updated successfully'
    });
  } catch (error) {
    console.error('Error updating method:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update method',
      error: error.message
    });
  }
});

// DELETE /api/methods/:id - Delete method (requires authentication)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const method = await Method.findById(req.params.id);
    
    if (!method) {
      return res.status(404).json({
        success: false,
        message: 'Method not found'
      });
    }

    const deleted = await method.delete();
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete method'
      });
    }
    
    res.json({
      success: true,
      message: 'Method deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting method:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete method',
      error: error.message
    });
  }
});

// POST /api/methods/:id/versions - Create new method version
router.post('/:id/versions', requireAuth, async (req, res) => {
  try {
    const method = await Method.findById(req.params.id);
    
    if (!method) {
      return res.status(404).json({
        success: false,
        message: 'Method not found'
      });
    }

    const { universeId, versionName, changeDescription } = req.body;
    
    const version = await method.createVersion({
      universeId,
      versionName,
      changeDescription,
      lastUpdateById: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: version,
      message: 'Method version created successfully'
    });
  } catch (error) {
    console.error('Error creating method version:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create method version',
      error: error.message
    });
  }
});

// GET /api/methods/versions/:versionId/practices - Get practices for method version
router.get('/versions/:versionId/practices', async (req, res) => {
  try {
    const methodVersion = await MethodVersion.findById(req.params.versionId);
    
    if (!methodVersion) {
      return res.status(404).json({
        success: false,
        message: 'Method version not found'
      });
    }

    const practices = await methodVersion.getPractices();
    
    res.json({
      success: true,
      data: practices
    });
  } catch (error) {
    console.error('Error fetching method version practices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch method version practices',
      error: error.message
    });
  }
});

// POST /api/methods/versions/:versionId/practices - Add practice to method version
router.post('/versions/:versionId/practices', requireAuth, async (req, res) => {
  try {
    const methodVersion = await MethodVersion.findById(req.params.versionId);
    
    if (!methodVersion) {
      return res.status(404).json({
        success: false,
        message: 'Method version not found'
      });
    }

    const { practiceVersionId } = req.body;
    
    await methodVersion.addPractice(practiceVersionId);
    
    res.status(201).json({
      success: true,
      message: 'Practice added to method version successfully'
    });
  } catch (error) {
    console.error('Error adding practice to method version:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to add practice to method version',
      error: error.message
    });
  }
});

// DELETE /api/methods/versions/:versionId/practices/:practiceVersionId - Remove practice from method version
router.delete('/versions/:versionId/practices/:practiceVersionId', requireAuth, async (req, res) => {
  try {
    const methodVersion = await MethodVersion.findById(req.params.versionId);
    
    if (!methodVersion) {
      return res.status(404).json({
        success: false,
        message: 'Method version not found'
      });
    }

    const removed = await methodVersion.removePractice(req.params.practiceVersionId);
    
    if (!removed) {
      return res.status(404).json({
        success: false,
        message: 'Practice not found in method version'
      });
    }
    
    res.json({
      success: true,
      message: 'Practice removed from method version successfully'
    });
  } catch (error) {
    console.error('Error removing practice from method version:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove practice from method version',
      error: error.message
    });
  }
});

module.exports = router;