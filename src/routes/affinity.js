const express = require('express');
const router = express.Router();
const PersonalityService = require('../services/personalityService');
const PersonPracticeAffinity = require('../models/PersonPracticeAffinity');
const BfProfile = require('../models/BfProfile');
const AffinitySurveyResults = require('../models/AffinitySurveyResults');
const { requireAuth } = require('../middleware/auth');

// Get personality profile for current user
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const profile = await PersonalityService.getPersonalityProfile(req.user.id);
    res.json({ success: true, data: profile });
  } catch (error) {
    console.error('Error fetching personality profile:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch personality profile' });
  }
});

// Alternative endpoint for tests - Get personality profile
router.get('/personality', requireAuth, async (req, res) => {
  try {
    const profile = await PersonalityService.getPersonalityProfile(req.user.id);
    res.json({ success: true, data: profile });
  } catch (error) {
    console.error('Error fetching personality profile:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch personality profile' });
  }
});

// Submit Big Five survey results
router.post('/survey', requireAuth, async (req, res) => {
  try {
    const { surveyAnswers } = req.body;
    
    if (!Array.isArray(surveyAnswers)) {
      return res.status(400).json({ success: false, error: 'Survey answers must be an array' });
    }

    const result = await PersonalityService.processSurveyResults(req.user.id, surveyAnswers);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error processing survey results:', error);
    res.status(500).json({ success: false, error: 'Failed to process survey results' });
  }
});

// Create personality profile - expected by tests
router.post('/personality', requireAuth, async (req, res) => {
  try {
    const { o, c, e, a, n } = req.body;
    
    // Validate Big Five scores (0-100)
    const scores = { o, c, e, a, n };
    for (const [trait, score] of Object.entries(scores)) {
      if (typeof score !== 'number' || score < 0 || score > 100) {
        return res.status(400).json({ 
          success: false, 
          error: `Invalid ${trait.toUpperCase()} score: must be between 0 and 100` 
        });
      }
    }

    const profile = await BfProfile.create({
      personId: req.user.id,
      statusId: 1, // Active
      o, c, e, a, n
    });

    res.status(201).json({ success: true, data: profile });
  } catch (error) {
    console.error('Error creating personality profile:', error);
    res.status(500).json({ success: false, error: 'Failed to create personality profile' });
  }
});

// Get affinity scores for current user
router.get('/scores', requireAuth, async (req, res) => {
  try {
    const affinities = await PersonPracticeAffinity.findByPersonId(req.user.id);
    res.json({ success: true, data: affinities });
  } catch (error) {
    console.error('Error fetching affinity scores:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch affinity scores' });
  }
});

// Get user affinities - expected by tests
router.get('/user-affinities', requireAuth, async (req, res) => {
  try {
    const affinities = await PersonPracticeAffinity.findByPersonId(req.user.id);
    res.json({ success: true, data: affinities });
  } catch (error) {
    console.error('Error fetching user affinities:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user affinities' });
  }
});

// Create practice affinity - expected by tests
router.post('/practice', requireAuth, async (req, res) => {
  try {
    const { practiceVersionId, affinity } = req.body;
    
    if (!practiceVersionId || typeof affinity !== 'number') {
      return res.status(400).json({ 
        success: false, 
        error: 'practiceVersionId and affinity are required' 
      });
    }

    if (affinity < 0 || affinity > 100) {
      return res.status(400).json({ 
        success: false, 
        error: 'Affinity must be between 0 and 100' 
      });
    }

    const practiceAffinity = await PersonPracticeAffinity.create({
      personId: req.user.id,
      practiceVersionId,
      affinity
    });

    res.status(201).json({ success: true, data: practiceAffinity });
  } catch (error) {
    console.error('Error creating practice affinity:', error);
    res.status(500).json({ success: false, error: 'Failed to create practice affinity' });
  }
});

// Recalculate affinities for current user
router.post('/recalculate', requireAuth, async (req, res) => {
  try {
    const affinities = await PersonalityService.recalculateAffinities(req.user.id);
    res.json({ 
      success: true,
      message: 'Affinities recalculated successfully',
      data: {
        count: affinities.length,
        affinities 
      }
    });
  } catch (error) {
    console.error('Error recalculating affinities:', error);
    res.status(500).json({ success: false, error: 'Failed to recalculate affinities' });
  }
});

// Get team affinity for a specific practice
router.get('/team/:teamId/practice/:practiceVersionId', requireAuth, async (req, res) => {
  try {
    const { teamId, practiceVersionId } = req.params;
    
    // Get team member IDs
    const Team = require('../models/Team');
    const team = await Team.findById(teamId);
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const members = await team.getMembers();
    const memberIds = members.map(member => member.id);

    const teamAffinity = await PersonalityService.calculateTeamAffinity(memberIds, practiceVersionId);
    res.json(teamAffinity);
  } catch (error) {
    console.error('Error calculating team affinity:', error);
    res.status(500).json({ error: 'Failed to calculate team affinity' });
  }
});

// Get practice recommendations for a team
router.get('/team/:teamId/recommendations', requireAuth, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { minThreshold = 60 } = req.query;
    
    // Get team member IDs
    const Team = require('../models/Team');
    const team = await Team.findById(teamId);
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const members = await team.getMembers();
    const memberIds = members.map(member => member.id);

    const recommendations = await PersonalityService.getTeamPracticeRecommendations(
      memberIds, 
      parseInt(minThreshold)
    );
    
    res.json(recommendations);
  } catch (error) {
    console.error('Error getting team recommendations:', error);
    res.status(500).json({ error: 'Failed to get team recommendations' });
  }
});

// Recalculate affinities for all team members
router.post('/team/:teamId/recalculate', requireAuth, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const results = await PersonalityService.recalculateTeamAffinities(teamId);
    
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;
    
    res.json({
      message: 'Team affinity recalculation completed',
      totalMembers: results.length,
      successful: successCount,
      errors: errorCount,
      results
    });
  } catch (error) {
    console.error('Error recalculating team affinities:', error);
    res.status(500).json({ error: 'Failed to recalculate team affinities' });
  }
});

// Get affinity score for a specific practice and user
router.get('/practice/:practiceVersionId', requireAuth, async (req, res) => {
  try {
    const { practiceVersionId } = req.params;
    const affinity = await PersonPracticeAffinity.findByPersonAndPractice(
      req.user.id, 
      practiceVersionId
    );
    
    if (!affinity) {
      return res.status(404).json({ success: false, error: 'Affinity score not found' });
    }
    
    res.json({ success: true, data: affinity });
  } catch (error) {
    console.error('Error fetching practice affinity:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch practice affinity' });
  }
});

// Update affinity score for a specific practice (manual override)
router.put('/practice/:practiceVersionId', requireAuth, async (req, res) => {
  try {
    const { practiceVersionId } = req.params;
    const { affinity } = req.body;
    
    if (affinity === undefined || affinity < 0 || affinity > 100) {
      return res.status(400).json({ success: false, error: 'Affinity must be between 0 and 100' });
    }

    let existingAffinity = await PersonPracticeAffinity.findByPersonAndPractice(
      req.user.id, 
      practiceVersionId
    );

    if (existingAffinity) {
      existingAffinity = await existingAffinity.update({ affinity });
    } else {
      existingAffinity = await PersonPracticeAffinity.create({
        personId: req.user.id,
        practiceVersionId,
        affinity
      });
    }
    
    res.json({ success: true, data: existingAffinity });
  } catch (error) {
    console.error('Error updating practice affinity:', error);
    res.status(500).json({ success: false, error: 'Failed to update practice affinity' });
  }
});

module.exports = router;