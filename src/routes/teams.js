const express = require('express');
const Team = require('../models/Team');
const Universe = require('../models/Universe');
const Person = require('../models/Person');
const emailService = require('../services/emailService');
const { requireAuth, requireTeamMember } = require('../middleware/auth');

const router = express.Router();

// Create a new team
router.post('/', requireAuth, requireTeamMember, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ 
        error: 'Team name is required' 
      });
    }

    // Check if team name already exists
    const existingTeam = await Team.findByName(name);
    if (existingTeam) {
      return res.status(409).json({ 
        error: 'Team name already exists' 
      });
    }

    // Create team with current user as creator
    const team = await Team.create({
      name,
      description,
      creatorId: req.user.id
    });

    // Create default universe for the team
    const universe = await Universe.create({
      teamId: team.id,
      name: `${team.name} Universe`,
      description: `Default customization context for ${team.name}`
    });

    res.status(201).json({
      message: 'Team created successfully',
      team: team.toJSON(),
      universe: universe.toJSON()
    });

  } catch (error) {
    console.error('Team creation error:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// Get teams for current user
router.get('/my-teams', requireAuth, async (req, res) => {
  try {
    const teams = await Team.getTeamsForPerson(req.user.id);
    res.json({ teams: teams.map(team => team.toJSON()) });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Failed to get teams' });
  }
});

// Get team details
router.get('/:teamId', requireAuth, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check if user is a member of this team
    const isMember = await team.isMember(req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied - not a team member' });
    }

    const members = await team.getMembers();
    const universes = await Universe.findByTeamId(team.id);

    res.json({
      team: team.toJSON(),
      members,
      universes: universes.map(u => u.toJSON())
    });

  } catch (error) {
    console.error('Get team details error:', error);
    res.status(500).json({ error: 'Failed to get team details' });
  }
});

// Invite member to team
router.post('/:teamId/invite', requireAuth, requireTeamMember, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check if current user is a member of this team
    const isMember = await team.isMember(req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied - not a team member' });
    }

    // Check if invited person already exists and is already a member
    const invitedPerson = await Person.findByEmail(email);
    if (invitedPerson) {
      const isAlreadyMember = await team.isMember(invitedPerson.id);
      if (isAlreadyMember) {
        return res.status(409).json({ 
          error: 'Person is already a team member' 
        });
      }
    }

    // Send invitation email
    await emailService.sendTeamInvitation({
      recipientEmail: email,
      teamName: team.name,
      inviterName: req.user.name,
      teamId: team.id
    });

    res.json({
      message: 'Invitation sent successfully',
      invitedEmail: email,
      teamName: team.name
    });

  } catch (error) {
    console.error('Team invitation error:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

// Join team (for invited users)
router.post('/:teamId/join', requireAuth, async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check if user is already a member
    const isAlreadyMember = await team.isMember(req.user.id);
    if (isAlreadyMember) {
      return res.status(409).json({ 
        error: 'You are already a member of this team' 
      });
    }

    // Add user to team
    await team.addMember(req.user.id);

    res.json({
      message: 'Successfully joined team',
      team: team.toJSON()
    });

  } catch (error) {
    console.error('Join team error:', error);
    res.status(500).json({ error: 'Failed to join team' });
  }
});

// Leave team
router.delete('/:teamId/leave', requireAuth, async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check if user is a member
    const isMember = await team.isMember(req.user.id);
    if (!isMember) {
      return res.status(404).json({ 
        error: 'You are not a member of this team' 
      });
    }

    // Remove user from team
    const removed = await team.removeMember(req.user.id);
    if (!removed) {
      return res.status(500).json({ error: 'Failed to leave team' });
    }

    res.json({
      message: 'Successfully left team',
      teamName: team.name
    });

  } catch (error) {
    console.error('Leave team error:', error);
    res.status(500).json({ error: 'Failed to leave team' });
  }
});

// Get team universes
router.get('/:teamId/universes', requireAuth, async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check if user is a member
    const isMember = await team.isMember(req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied - not a team member' });
    }

    const universes = await Universe.findByTeamId(teamId);
    res.json({ universes: universes.map(u => u.toJSON()) });

  } catch (error) {
    console.error('Get universes error:', error);
    res.status(500).json({ error: 'Failed to get universes' });
  }
});

// Create universe for team
router.post('/:teamId/universes', requireAuth, requireTeamMember, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ 
        error: 'Universe name is required' 
      });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check if user is a member
    const isMember = await team.isMember(req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied - not a team member' });
    }

    // Check if universe name already exists for this team
    const existingUniverse = await Universe.findByTeamAndName(teamId, name);
    if (existingUniverse) {
      return res.status(409).json({ 
        error: 'Universe name already exists for this team' 
      });
    }

    const universe = await Universe.create({
      teamId: parseInt(teamId),
      name,
      description
    });

    res.status(201).json({
      message: 'Universe created successfully',
      universe: universe.toJSON()
    });

  } catch (error) {
    console.error('Create universe error:', error);
    res.status(500).json({ error: 'Failed to create universe' });
  }
});

module.exports = router;