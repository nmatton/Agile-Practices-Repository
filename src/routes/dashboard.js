const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const Universe = require('../models/Universe');
const Practice = require('../models/Practice');
const PracticeVersion = require('../models/PracticeVersion');
const Goal = require('../models/Goal');
const PersonPracticeAffinity = require('../models/PersonPracticeAffinity');
const { requireAuth, requireTeamMember } = require('../middleware/auth');
const cacheService = require('../services/cacheService');
const QueryOptimizationService = require('../services/queryOptimizationService');

// GET /api/dashboard/teams/:teamId - Get team dashboard with active practices and OAR coverage (optimized)
router.get('/teams/:teamId', requireAuth, requireTeamMember, async (req, res) => {
  try {
    const { teamId } = req.params;
    const teamIdInt = parseInt(teamId);

    // Check cache first
    let dashboardData = await cacheService.getCachedTeamDashboard(teamIdInt);
    
    if (!dashboardData) {
      // Verify team exists and user is a member
      const team = await Team.findById(teamIdInt);
      if (!team) {
        return res.status(404).json({ 
          success: false, 
          message: 'Team not found' 
        });
      }

      const isMember = await team.isMember(req.user.id);
      if (!isMember) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied - not a team member' 
        });
      }

      // Use optimized single-query dashboard fetch
      dashboardData = await QueryOptimizationService.getTeamDashboardOptimized(teamIdInt);
      
      if (!dashboardData) {
        return res.status(404).json({ 
          success: false, 
          message: 'Team dashboard data not found' 
        });
      }

      // Process OAR coverage
      const activePractices = dashboardData.activepractices || [];
      const oarCoverage = new Map();
      
      activePractices.forEach(practice => {
        if (practice.goals && practice.goals.length > 0) {
          practice.goals.forEach(goal => {
            if (!oarCoverage.has(goal.id)) {
              oarCoverage.set(goal.id, {
                goal: goal,
                practices: []
              });
            }
            oarCoverage.get(goal.id).practices.push({
              id: practice.practiceVersionId,
              name: practice.practiceName,
              affinity: practice.teamAffinity
            });
          });
        }
      });

      // Get all available goals for coverage analysis
      const allGoals = await Goal.findAll();
      const uncoveredGoals = allGoals.filter(goal => !oarCoverage.has(goal.id));
      
      // Format response data
      const responseData = {
        team: {
          id: dashboardData.id,
          name: dashboardData.name,
          description: dashboardData.description
        },
        universes: dashboardData.universes || [],
        activePractices: activePractices,
        oarCoverage: {
          covered: Array.from(oarCoverage.values()),
          uncovered: uncoveredGoals.map(g => g.toJSON()),
          coveragePercentage: allGoals.length > 0 
            ? Math.round((oarCoverage.size / allGoals.length) * 100) 
            : 0
        },
        teamAffinityStats: {
          averageAffinity: activePractices.length > 0 
            ? Math.round(activePractices.reduce((sum, p) => sum + (p.teamAffinity || 0), 0) / activePractices.length)
            : 0,
          lowAffinityPractices: activePractices.filter(p => p.hasLowAffinity).length,
          totalPractices: activePractices.length
        }
      };

      // Cache the processed data
      await cacheService.cacheTeamDashboard(teamIdInt, responseData);
      dashboardData = responseData;
    }

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Error fetching team dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team dashboard',
      error: error.message
    });
  }
});

// POST /api/dashboard/teams/:teamId/practices - Add practice to team universe
router.post('/teams/:teamId/practices', requireAuth, requireTeamMember, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { practiceVersionId, universeId } = req.body;

    if (!practiceVersionId || !universeId) {
      return res.status(400).json({
        success: false,
        message: 'Practice version ID and universe ID are required'
      });
    }

    // Verify team exists and user is a member
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ 
        success: false, 
        message: 'Team not found' 
      });
    }

    const isMember = await team.isMember(req.user.id);
    if (!isMember) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied - not a team member' 
      });
    }

    // Verify universe belongs to team
    const universe = await Universe.findById(universeId);
    if (!universe || universe.teamId !== parseInt(teamId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid universe for this team'
      });
    }

    // Verify practice version exists
    const practiceVersion = await PracticeVersion.findById(practiceVersionId);
    if (!practiceVersion) {
      return res.status(404).json({
        success: false,
        message: 'Practice version not found'
      });
    }

    // Add practice to universe
    await universe.addPractice(practiceVersionId, true);

    // Get practice details for response
    const practice = await Practice.findById(practiceVersion.practiceId);
    
    res.status(201).json({
      success: true,
      message: 'Practice added to team universe successfully',
      data: {
        practiceVersionId,
        universeId,
        practiceName: practice ? practice.name : 'Unknown Practice'
      }
    });

  } catch (error) {
    console.error('Error adding practice to team universe:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add practice to team universe',
      error: error.message
    });
  }
});

// DELETE /api/dashboard/teams/:teamId/practices/:practiceVersionId - Remove practice from team universe
router.delete('/teams/:teamId/practices/:practiceVersionId', requireAuth, requireTeamMember, async (req, res) => {
  try {
    const { teamId, practiceVersionId } = req.params;
    const { universeId } = req.query;

    if (!universeId) {
      return res.status(400).json({
        success: false,
        message: 'Universe ID is required'
      });
    }

    // Verify team exists and user is a member
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ 
        success: false, 
        message: 'Team not found' 
      });
    }

    const isMember = await team.isMember(req.user.id);
    if (!isMember) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied - not a team member' 
      });
    }

    // Verify universe belongs to team
    const universe = await Universe.findById(universeId);
    if (!universe || universe.teamId !== parseInt(teamId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid universe for this team'
      });
    }

    // Remove practice from universe
    const removed = await universe.removePractice(practiceVersionId);
    
    if (!removed) {
      return res.status(404).json({
        success: false,
        message: 'Practice not found in team universe'
      });
    }

    res.json({
      success: true,
      message: 'Practice removed from team universe successfully'
    });

  } catch (error) {
    console.error('Error removing practice from team universe:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove practice from team universe',
      error: error.message
    });
  }
});

// GET /api/dashboard/teams/:teamId/affinity/:practiceVersionId - Get detailed affinity breakdown for a practice
router.get('/teams/:teamId/affinity/:practiceVersionId', requireAuth, requireTeamMember, async (req, res) => {
  try {
    const { teamId, practiceVersionId } = req.params;

    // Verify team exists and user is a member
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ 
        success: false, 
        message: 'Team not found' 
      });
    }

    const isMember = await team.isMember(req.user.id);
    if (!isMember) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied - not a team member' 
      });
    }

    // Get detailed team affinity breakdown
    const affinityBreakdown = await getDetailedTeamAffinity(teamId, practiceVersionId);
    
    res.json({
      success: true,
      data: affinityBreakdown
    });

  } catch (error) {
    console.error('Error fetching practice affinity breakdown:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch practice affinity breakdown',
      error: error.message
    });
  }
});

// Helper function to calculate team affinity for a practice
async function calculateTeamAffinity(teamId, practiceVersionId) {
  try {
    // Get team members
    const team = await Team.findById(teamId);
    const members = await team.getMembers();
    
    if (members.length === 0) {
      return {
        averageAffinity: 0,
        lowAffinityMembers: [],
        hasLowAffinity: false,
        memberCount: 0
      };
    }

    // Get affinity scores for each member
    const memberAffinities = [];
    const lowAffinityMembers = [];
    const LOW_AFFINITY_THRESHOLD = 40; // Practices with affinity < 40 are considered low

    for (const member of members) {
      const affinity = await PersonPracticeAffinity.findByPersonAndPractice(member.id, practiceVersionId);
      const affinityScore = affinity ? affinity.affinity : 0;
      
      memberAffinities.push({
        memberId: member.id,
        memberName: member.name,
        affinity: affinityScore
      });

      if (affinityScore < LOW_AFFINITY_THRESHOLD) {
        lowAffinityMembers.push({
          memberId: member.id,
          memberName: member.name,
          affinity: affinityScore
        });
      }
    }

    const averageAffinity = memberAffinities.length > 0 
      ? Math.round(memberAffinities.reduce((sum, m) => sum + m.affinity, 0) / memberAffinities.length)
      : 0;

    return {
      averageAffinity,
      lowAffinityMembers,
      hasLowAffinity: lowAffinityMembers.length > 0,
      memberCount: members.length,
      memberAffinities
    };

  } catch (error) {
    console.error('Error calculating team affinity:', error);
    return {
      averageAffinity: 0,
      lowAffinityMembers: [],
      hasLowAffinity: false,
      memberCount: 0
    };
  }
}

// Helper function to get detailed team affinity breakdown
async function getDetailedTeamAffinity(teamId, practiceVersionId) {
  try {
    const teamAffinity = await calculateTeamAffinity(teamId, practiceVersionId);
    
    // Get practice details
    const practiceVersion = await PracticeVersion.findById(practiceVersionId);
    let practiceDetails = null;
    
    if (practiceVersion) {
      const practice = await Practice.findById(practiceVersion.practiceId);
      if (practice) {
        practiceDetails = await practice.getCompleteDetails();
      }
    }

    return {
      practiceVersionId,
      practice: practiceDetails,
      teamAffinity: teamAffinity.averageAffinity,
      memberCount: teamAffinity.memberCount,
      lowAffinityCount: teamAffinity.lowAffinityMembers.length,
      hasLowAffinity: teamAffinity.hasLowAffinity,
      memberAffinities: teamAffinity.memberAffinities || [],
      lowAffinityMembers: teamAffinity.lowAffinityMembers,
      affinityDistribution: {
        high: teamAffinity.memberAffinities ? teamAffinity.memberAffinities.filter(m => m.affinity >= 70).length : 0,
        medium: teamAffinity.memberAffinities ? teamAffinity.memberAffinities.filter(m => m.affinity >= 40 && m.affinity < 70).length : 0,
        low: teamAffinity.memberAffinities ? teamAffinity.memberAffinities.filter(m => m.affinity < 40).length : 0
      }
    };

  } catch (error) {
    console.error('Error getting detailed team affinity:', error);
    throw error;
  }
}

// GET /api/dashboard/user - Get user dashboard with personal data
router.get('/user', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's teams
    const teams = await Team.getTeamsForPerson(userId);
    
    // Get user's personality profile
    const PersonalityService = require('../services/personalityService');
    let personalityProfile = null;
    try {
      personalityProfile = await PersonalityService.getPersonalityProfile(userId);
    } catch (error) {
      console.warn('No personality profile found for user:', userId);
    }
    
    // Get user's practice affinities
    const affinities = await PersonPracticeAffinity.findByPersonId(userId);
    
    // Get user's recent activity (simplified)
    const recentActivity = {
      teamsJoined: teams.length,
      affinitiesCalculated: affinities.length,
      hasPersonalityProfile: !!personalityProfile
    };

    const dashboardData = {
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        roleId: req.user.roleId
      },
      teams: teams.map(team => team.toJSON()),
      personalityProfile,
      affinityCount: affinities.length,
      recentActivity
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Error fetching user dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user dashboard',
      error: error.message
    });
  }
});

module.exports = router;