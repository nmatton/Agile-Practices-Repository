const express = require('express');
const router = express.Router();
const RecommendationService = require('../services/recommendationService');
const { requireAuth } = require('../middleware/auth');

// GET /api/recommendations/alternatives/:practiceVersionId - Get alternative practices for a problematic practice
router.get('/alternatives/:practiceVersionId', requireAuth, async (req, res) => {
  try {
    const { practiceVersionId } = req.params;
    const { teamMemberIds, minAffinityImprovement = 10 } = req.query;
    
    if (!teamMemberIds) {
      return res.status(400).json({
        success: false,
        message: 'Team member IDs are required'
      });
    }
    
    const memberIds = Array.isArray(teamMemberIds) 
      ? teamMemberIds.map(id => parseInt(id))
      : teamMemberIds.split(',').map(id => parseInt(id));
    
    const alternatives = await RecommendationService.findAlternativePractices(
      parseInt(practiceVersionId),
      memberIds,
      parseInt(minAffinityImprovement)
    );
    
    res.json({
      success: true,
      data: alternatives,
      meta: {
        practiceVersionId: parseInt(practiceVersionId),
        teamMemberCount: memberIds.length,
        alternativeCount: alternatives.length
      }
    });
  } catch (error) {
    console.error('Error getting alternative practices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get alternative practices',
      error: error.message
    });
  }
});

// POST /api/recommendations/flag-difficulty - Flag a practice as difficult
router.post('/flag-difficulty', requireAuth, async (req, res) => {
  try {
    const { practiceVersionId, reason, contextId } = req.body;
    const personId = req.user.id;
    
    if (!practiceVersionId) {
      return res.status(400).json({
        success: false,
        message: 'Practice version ID is required'
      });
    }
    
    const flag = await RecommendationService.flagPracticeDifficulty(
      personId,
      parseInt(practiceVersionId),
      reason,
      contextId ? parseInt(contextId) : null
    );
    
    res.status(201).json({
      success: true,
      data: flag,
      message: 'Practice difficulty flagged successfully'
    });
  } catch (error) {
    console.error('Error flagging practice difficulty:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to flag practice difficulty',
      error: error.message
    });
  }
});

// GET /api/recommendations/context-aware - Get context-aware recommendations
router.get('/context-aware', requireAuth, async (req, res) => {
  try {
    const { teamMemberIds, contextId, goalIds } = req.query;
    
    if (!teamMemberIds) {
      return res.status(400).json({
        success: false,
        message: 'Team member IDs are required'
      });
    }
    
    const memberIds = Array.isArray(teamMemberIds) 
      ? teamMemberIds.map(id => parseInt(id))
      : teamMemberIds.split(',').map(id => parseInt(id));
    
    const goals = goalIds 
      ? (Array.isArray(goalIds) ? goalIds.map(id => parseInt(id)) : goalIds.split(',').map(id => parseInt(id)))
      : [];
    
    const recommendations = await RecommendationService.getContextAwareRecommendations(
      memberIds,
      contextId ? parseInt(contextId) : null,
      goals
    );
    
    res.json({
      success: true,
      data: recommendations,
      meta: {
        teamMemberCount: memberIds.length,
        contextId: contextId ? parseInt(contextId) : null,
        goalCount: goals.length,
        recommendationCount: recommendations.length
      }
    });
  } catch (error) {
    console.error('Error getting context-aware recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get context-aware recommendations',
      error: error.message
    });
  }
});

// GET /api/recommendations/comprehensive - Get comprehensive recommendations for a team
router.get('/comprehensive', requireAuth, async (req, res) => {
  try {
    const { 
      teamMemberIds, 
      minAffinityThreshold = 60,
      contextId,
      goalIds,
      includeDifficult = true,
      includeAlternatives = true
    } = req.query;
    
    if (!teamMemberIds) {
      return res.status(400).json({
        success: false,
        message: 'Team member IDs are required'
      });
    }
    
    const memberIds = Array.isArray(teamMemberIds) 
      ? teamMemberIds.map(id => parseInt(id))
      : teamMemberIds.split(',').map(id => parseInt(id));
    
    const goals = goalIds 
      ? (Array.isArray(goalIds) ? goalIds.map(id => parseInt(id)) : goalIds.split(',').map(id => parseInt(id)))
      : [];
    
    const options = {
      minAffinityThreshold: parseInt(minAffinityThreshold),
      contextId: contextId ? parseInt(contextId) : null,
      goalIds: goals,
      includeDifficult: includeDifficult === 'true',
      includeAlternatives: includeAlternatives === 'true'
    };
    
    const report = await RecommendationService.getComprehensiveRecommendations(memberIds, options);
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error getting comprehensive recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get comprehensive recommendations',
      error: error.message
    });
  }
});

// GET /api/recommendations/flagged-practices - Get flagged practices with alternatives
router.get('/flagged-practices', requireAuth, async (req, res) => {
  try {
    const { teamMemberIds } = req.query;
    
    if (!teamMemberIds) {
      return res.status(400).json({
        success: false,
        message: 'Team member IDs are required'
      });
    }
    
    const memberIds = Array.isArray(teamMemberIds) 
      ? teamMemberIds.map(id => parseInt(id))
      : teamMemberIds.split(',').map(id => parseInt(id));
    
    const flaggedPractices = await RecommendationService.getFlaggedPracticesWithAlternatives(memberIds);
    
    res.json({
      success: true,
      data: flaggedPractices,
      meta: {
        teamMemberCount: memberIds.length,
        flaggedPracticeCount: flaggedPractices.length
      }
    });
  } catch (error) {
    console.error('Error getting flagged practices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get flagged practices',
      error: error.message
    });
  }
});

module.exports = router;