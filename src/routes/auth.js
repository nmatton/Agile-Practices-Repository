const express = require('express');
const Person = require('../models/Person');
const TeamInvitation = require('../models/TeamInvitation');
const { requireAuth, requireExpert, requireTeamMember } = require('../middleware/auth');
const emailService = require('../services/emailService');

const router = express.Router();

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Validate passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ 
        success: false,
        error: 'Passwords do not match' 
      });
    }

    // Create new user
    const person = await Person.create({ name, email, password });

    // Check for pending team invitations and auto-accept them
    let joinedTeams = [];
    try {
      joinedTeams = await TeamInvitation.acceptAllPendingForEmail(email, person.id);
    } catch (error) {
      console.error('Failed to process pending invitations:', error);
      // Don't fail registration if invitation processing fails
    }

    // Send welcome email (non-blocking)
    try {
      await emailService.sendWelcomeEmail({
        recipientEmail: email,
        userName: name
      });
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't fail registration if email fails
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: person.toJSON(),
      joinedTeams: joinedTeams
    });

  } catch (error) {
    if (error.message === 'Email already exists') {
      return res.status(409).json({ success: false, error: error.message });
    }
    if (error.message === 'Invalid email format') {
      return res.status(400).json({ success: false, error: error.message });
    }
    
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and password are required' 
      });
    }

    // Find user by email
    const person = await Person.findByEmail(email);
    if (!person) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    // Validate password
    const isValidPassword = await person.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    // Create session
    req.session.userId = person.id;
    req.session.userEmail = person.email;
    req.session.userRole = person.roleId;

    // Save session explicitly and ensure it's persisted
    return new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ success: false, error: 'Session creation failed' });
        }
        
        res.json({
          success: true,
          message: 'Login successful',
          user: person.toJSON()
        });
      });
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ success: false, error: 'Logout failed' });
    }
    
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logout successful' });
  });
});

// Get current user
router.get('/me', requireAuth, async (req, res) => {
  try {
    res.json({ success: true, user: req.user.toJSON() });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: 'Failed to get user information' });
  }
});

// Protected endpoint - requires team member access or higher
router.get('/profile', requireAuth, requireTeamMember, async (req, res) => {
  try {
    res.json({ 
      message: 'Team member profile access',
      user: req.user.toJSON() 
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Protected endpoint - requires expert access
router.get('/admin', requireAuth, requireExpert, async (req, res) => {
  try {
    res.json({ 
      message: 'Expert admin access granted',
      user: req.user.toJSON() 
    });
  } catch (error) {
    console.error('Admin error:', error);
    res.status(500).json({ error: 'Failed to access admin' });
  }
});

module.exports = router;