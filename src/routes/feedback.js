const express = require('express');
const router = express.Router();
const ExperienceFeedback = require('../models/ExperienceFeedback');
const { requireAuth, requireRole } = require('../middleware/auth');

// Get feedback for a specific practice version
router.get('/practice/:practiceVersionId', async (req, res) => {
  try {
    const { practiceVersionId } = req.params;
    const { includeUnvalidated = false, limit = 50, offset = 0 } = req.query;

    // Only authenticated experts can see unvalidated feedback
    const canSeeUnvalidated = req.session.user && 
      (req.session.user.roleId === 1 || includeUnvalidated === 'true');

    const feedback = await ExperienceFeedback.findByPracticeVersion(
      practiceVersionId, 
      { 
        includeUnvalidated: canSeeUnvalidated, 
        limit: parseInt(limit), 
        offset: parseInt(offset) 
      }
    );

    const stats = await ExperienceFeedback.getStatsByPracticeVersion(practiceVersionId);

    res.json({
      feedback,
      stats,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: feedback.length
      }
    });
  } catch (error) {
    console.error('Error fetching practice feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Get feedback statistics for a practice version
router.get('/practice/:practiceVersionId/stats', async (req, res) => {
  try {
    const { practiceVersionId } = req.params;
    const stats = await ExperienceFeedback.getStatsByPracticeVersion(practiceVersionId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching feedback stats:', error);
    res.status(500).json({ error: 'Failed to fetch feedback statistics' });
  }
});

// Submit new feedback (authenticated users only)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { practiceVersionId, projectContext, feedbackText, rating } = req.body;
    const personId = req.session.user.id;

    if (!practiceVersionId || !feedbackText) {
      return res.status(400).json({ 
        error: 'Practice version ID and feedback text are required' 
      });
    }

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ 
        error: 'Rating must be between 1 and 5' 
      });
    }

    const feedback = await ExperienceFeedback.create({
      practiceVersionId,
      personId,
      projectContext,
      feedbackText,
      rating
    });

    // Fetch the complete feedback with author information
    const completeFeedback = await ExperienceFeedback.findById(feedback.id);

    res.status(201).json(completeFeedback);
  } catch (error) {
    console.error('Error creating feedback:', error);
    if (error.message.includes('required') || error.message.includes('Rating must')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create feedback' });
    }
  }
});

// Get feedback by user (authenticated users can see their own feedback)
router.get('/user/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Users can only see their own feedback unless they're experts
    if (req.session.user.id !== parseInt(userId) && req.session.user.roleId !== 1) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const feedback = await ExperienceFeedback.findByPerson(
      userId, 
      { limit: parseInt(limit), offset: parseInt(offset) }
    );

    res.json({
      feedback,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: feedback.length
      }
    });
  } catch (error) {
    console.error('Error fetching user feedback:', error);
    res.status(500).json({ error: 'Failed to fetch user feedback' });
  }
});

// Get pending feedback for moderation (experts only)
router.get('/pending', requireRole(1), async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const pendingFeedback = await ExperienceFeedback.findPendingValidation({
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      feedback: pendingFeedback,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: pendingFeedback.length
      }
    });
  } catch (error) {
    console.error('Error fetching pending feedback:', error);
    res.status(500).json({ error: 'Failed to fetch pending feedback' });
  }
});

// Validate feedback (experts only)
router.post('/:feedbackId/validate', requireRole(1), async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const validatedBy = req.session.user.id;

    const feedback = await ExperienceFeedback.findById(feedbackId);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    if (feedback.isValidated) {
      return res.status(400).json({ error: 'Feedback is already validated' });
    }

    await feedback.validate(validatedBy);
    
    // Fetch updated feedback with validator information
    const updatedFeedback = await ExperienceFeedback.findById(feedbackId);
    
    res.json(updatedFeedback);
  } catch (error) {
    console.error('Error validating feedback:', error);
    res.status(500).json({ error: 'Failed to validate feedback' });
  }
});

// Reject feedback (experts only) - this deletes the feedback
router.delete('/:feedbackId/reject', requireRole(1), async (req, res) => {
  try {
    const { feedbackId } = req.params;

    const feedback = await ExperienceFeedback.findById(feedbackId);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    if (feedback.isValidated) {
      return res.status(400).json({ error: 'Cannot reject validated feedback' });
    }

    const deleted = await feedback.reject();
    if (!deleted) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.json({ message: 'Feedback rejected and removed' });
  } catch (error) {
    console.error('Error rejecting feedback:', error);
    res.status(500).json({ error: 'Failed to reject feedback' });
  }
});

// Update feedback (users can update their own unvalidated feedback)
router.put('/:feedbackId', requireAuth, async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { projectContext, feedbackText, rating } = req.body;

    const feedback = await ExperienceFeedback.findById(feedbackId);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    // Users can only update their own feedback, and only if it's not validated
    if (feedback.personId !== req.session.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (feedback.isValidated) {
      return res.status(400).json({ error: 'Cannot update validated feedback' });
    }

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ 
        error: 'Rating must be between 1 and 5' 
      });
    }

    await feedback.update({ projectContext, feedbackText, rating });
    
    // Fetch updated feedback with complete information
    const updatedFeedback = await ExperienceFeedback.findById(feedbackId);
    
    res.json(updatedFeedback);
  } catch (error) {
    console.error('Error updating feedback:', error);
    if (error.message.includes('Rating must')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update feedback' });
    }
  }
});

// Delete feedback (users can delete their own unvalidated feedback)
router.delete('/:feedbackId', requireAuth, async (req, res) => {
  try {
    const { feedbackId } = req.params;

    const feedback = await ExperienceFeedback.findById(feedbackId);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    // Users can only delete their own feedback, and only if it's not validated
    // Experts can delete any feedback
    const canDelete = feedback.personId === req.session.user.id || req.session.user.roleId === 1;
    
    if (!canDelete) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (feedback.isValidated && req.session.user.roleId !== 1) {
      return res.status(400).json({ error: 'Cannot delete validated feedback' });
    }

    const deleted = await feedback.delete();
    if (!deleted) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.json({ message: 'Feedback deleted successfully' });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

// Get specific feedback by ID
router.get('/:feedbackId', async (req, res) => {
  try {
    const { feedbackId } = req.params;

    const feedback = await ExperienceFeedback.findById(feedbackId);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    // Only show validated feedback to non-authenticated users
    // Authenticated users can see their own feedback
    // Experts can see all feedback
    const canView = feedback.isValidated || 
                   (req.session.user && feedback.personId === req.session.user.id) ||
                   (req.session.user && req.session.user.roleId === 1);

    if (!canView) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.json(feedback);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

module.exports = router;