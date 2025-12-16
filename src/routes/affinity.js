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
    const profile = await PersonalityService.getPersonalityProfile(req.session.userId);
    res.json(profile);
  } catch (error) {
    console.error('Error fetching personality profile:', error);
    res.status(500).json({ error: 'Failed to fetch personality profile' });
  }
});

// Submit Big Five survey results
router.post('/survey', requireAuth, async (req, res) => {
  try {
    const { surveyAnswers } = req.body;
    
    if (!Array.isArray(surveyAnswers)) {
      return res.status(400).json({ error: 'Survey answers must be an array' });
    }

    const result = await PersonalityService.processSurveyResults(req.session.userId, surveyAnswers);
    res.json(result);
  } catch (error) {
    console.error('Error processing survey results:', error);
    res.status(500).json({ error: 'Failed to process survey results' });
  }
});

// Get affinity scores for current user
router.get('/scores', requireAuth, async (req, res) => {
  try {
    const affinities = await PersonPracticeAffinity.findByPersonId(req.session.userId);
    res.json(affinities);
  } catch (error) {
    console.error('Error fetching affinity scores:', error);
    res.status(500).json({ error: 'Failed to fetch affinity scores' });
  }
});

// Recalculate affinities for current user
router.post('/recalculate', requireAuth, async (req, res) => {
  try {
    const affinities = await PersonalityService.recalculateAffinities(req.session.userId);
    res.json({ 
      message: 'Affinities recalculated successfully',
      count: affinities.length,
      affinities 
    });
  } catch (error) {
    console.error('Error recalculating affinities:', error);
    res.status(500).json({ error: 'Failed to recalculate affinities' });
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
      req.session.userId, 
      practiceVersionId
    );
    
    if (!affinity) {
      return res.status(404).json({ error: 'Affinity score not found' });
    }
    
    res.json(affinity);
  } catch (error) {
    console.error('Error fetching practice affinity:', error);
    res.status(500).json({ error: 'Failed to fetch practice affinity' });
  }
});

// Update affinity score for a specific practice (manual override)
router.put('/practice/:practiceVersionId', requireAuth, async (req, res) => {
  try {
    const { practiceVersionId } = req.params;
    const { affinity } = req.body;
    
    if (affinity === undefined || affinity < 0 || affinity > 100) {
      return res.status(400).json({ error: 'Affinity must be between 0 and 100' });
    }

    let existingAffinity = await PersonPracticeAffinity.findByPersonAndPractice(
      req.session.userId, 
      practiceVersionId
    );

    if (existingAffinity) {
      existingAffinity = await existingAffinity.update({ affinity });
    } else {
      existingAffinity = await PersonPracticeAffinity.create({
        personId: req.session.userId,
        practiceVersionId,
        affinity
      });
    }
    
    res.json(existingAffinity);
  } catch (error) {
    console.error('Error updating practice affinity:', error);
    res.status(500).json({ error: 'Failed to update practice affinity' });
  }
});

module.exports = router;