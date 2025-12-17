const express = require('express');
const router = express.Router();
const visualizationService = require('../services/visualizationService');
const { requireAuth } = require('../middleware/auth');

/**
 * GET /api/visualization/practice/:id/card
 * Get card data for a specific practice version
 */
router.get('/practice/:id/card', async (req, res) => {
  try {
    const practiceVersionId = parseInt(req.params.id);
    
    if (isNaN(practiceVersionId)) {
      return res.status(400).json({ 
        error: 'Invalid practice version ID' 
      });
    }
    
    const cardData = await visualizationService.transformPracticeToCard(practiceVersionId);
    
    res.json({
      success: true,
      data: cardData
    });
  } catch (error) {
    console.error('Error getting practice card:', error);
    
    if (error.message === 'Practice version not found') {
      return res.status(404).json({ 
        error: 'Practice version not found' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to generate practice card' 
    });
  }
});

/**
 * GET /api/visualization/universe/:id/cards
 * Get all practice cards for a team's universe
 */
router.get('/universe/:id/cards', requireAuth, async (req, res) => {
  try {
    const universeId = parseInt(req.params.id);
    
    if (isNaN(universeId)) {
      return res.status(400).json({ 
        error: 'Invalid universe ID' 
      });
    }
    
    const cards = await visualizationService.getPracticeCardsForUniverse(universeId);
    
    res.json({
      success: true,
      data: {
        universeId: universeId,
        cards: cards,
        totalCards: cards.length
      }
    });
  } catch (error) {
    console.error('Error getting universe cards:', error);
    res.status(500).json({ 
      error: 'Failed to get practice cards for universe' 
    });
  }
});

/**
 * GET /api/visualization/practice/:id/canvas
 * Get Draw2d canvas configuration for practice visualization
 */
router.get('/practice/:id/canvas', async (req, res) => {
  try {
    const practiceVersionId = parseInt(req.params.id);
    
    if (isNaN(practiceVersionId)) {
      return res.status(400).json({ 
        error: 'Invalid practice version ID' 
      });
    }
    
    const cardData = await visualizationService.transformPracticeToCard(practiceVersionId);
    const canvasConfig = visualizationService.generateCanvasConfig([cardData]);
    
    res.json({
      success: true,
      data: canvasConfig
    });
  } catch (error) {
    console.error('Error generating canvas config:', error);
    
    if (error.message === 'Practice version not found') {
      return res.status(404).json({ 
        error: 'Practice version not found' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to generate canvas configuration' 
    });
  }
});

/**
 * GET /api/visualization/universe/:id/canvas
 * Get Draw2d canvas configuration for universe visualization
 */
router.get('/universe/:id/canvas', requireAuth, async (req, res) => {
  try {
    const universeId = parseInt(req.params.id);
    
    if (isNaN(universeId)) {
      return res.status(400).json({ 
        error: 'Invalid universe ID' 
      });
    }
    
    const cards = await visualizationService.getPracticeCardsForUniverse(universeId);
    const canvasConfig = visualizationService.generateCanvasConfig(cards);
    
    res.json({
      success: true,
      data: canvasConfig
    });
  } catch (error) {
    console.error('Error generating universe canvas config:', error);
    res.status(500).json({ 
      error: 'Failed to generate canvas configuration for universe' 
    });
  }
});

/**
 * GET /api/visualization/practice/:id/print
 * Get print-optimized layout for practice card
 */
router.get('/practice/:id/print', async (req, res) => {
  try {
    const practiceVersionId = parseInt(req.params.id);
    
    if (isNaN(practiceVersionId)) {
      return res.status(400).json({ 
        error: 'Invalid practice version ID' 
      });
    }
    
    const cardData = await visualizationService.transformPracticeToCard(practiceVersionId);
    const printLayout = visualizationService.generatePrintLayout([cardData]);
    
    res.json({
      success: true,
      data: printLayout
    });
  } catch (error) {
    console.error('Error generating print layout:', error);
    
    if (error.message === 'Practice version not found') {
      return res.status(404).json({ 
        error: 'Practice version not found' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to generate print layout' 
    });
  }
});

/**
 * GET /api/visualization/universe/:id/print
 * Get print-optimized layout for universe cards
 */
router.get('/universe/:id/print', requireAuth, async (req, res) => {
  try {
    const universeId = parseInt(req.params.id);
    
    if (isNaN(universeId)) {
      return res.status(400).json({ 
        error: 'Invalid universe ID' 
      });
    }
    
    const cards = await visualizationService.getPracticeCardsForUniverse(universeId);
    const printLayout = visualizationService.generatePrintLayout(cards);
    
    res.json({
      success: true,
      data: printLayout
    });
  } catch (error) {
    console.error('Error generating universe print layout:', error);
    res.status(500).json({ 
      error: 'Failed to generate print layout for universe' 
    });
  }
});

module.exports = router;