const express = require('express');
const Person = require('../models/Person');
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
        error: 'Passwords do not match' 
      });
    }

    // Create new user
    const person = await Person.create({ name, email, password });

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
      message: 'Registration successful',
      user: person.toJSON()
    });

  } catch (error) {
    if (error.message === 'Email already exists') {
      return res.status(409).json({ error: error.message });
    }
    if (error.message === 'Invalid email format') {
      return res.status(400).json({ error: error.message });
    }
    
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // Find user by email
    const person = await Person.findByEmail(email);
    if (!person) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    // Validate password
    const isValidPassword = await person.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    // Create session
    req.session.userId = person.id;
    req.session.userEmail = person.email;

    res.json({
      message: 'Login successful',
      user: person.toJSON()
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    res.clearCookie('connect.sid');
    res.json({ message: 'Logout successful' });
  });
});

// Get current user
router.get('/me', requireAuth, async (req, res) => {
  try {
    res.json({ user: req.user.toJSON() });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user information' });
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