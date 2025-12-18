const Person = require('../models/Person');

/**
 * Middleware to check if user is authenticated
 */
const requireAuth = async (req, res, next) => {
  try {
    // Check if session exists and has userId
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required',
        message: 'No valid session found'
      });
    }

    // Fetch user details and attach to request
    const user = await Person.findById(req.session.userId);
    if (!user) {
      // Clear invalid session
      req.session.destroy();
      return res.status(401).json({ 
        success: false, 
        error: 'User not found',
        message: 'Session user no longer exists'
      });
    }

    // Verify session role matches current user role
    if (req.session.userRole && req.session.userRole !== user.roleId) {
      // Update session with current role
      req.session.userRole = user.roleId;
      await new Promise((resolve) => {
        req.session.save(() => resolve());
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ success: false, error: 'Authentication failed' });
  }
};

/**
 * Middleware to check if user has a specific role or higher privileges
 * Role hierarchy: Expert (1) > Team Member (2) > Scrum Master (3) > Guest (4)
 * Lower numbers = higher privileges
 * @param {number} requiredRoleId - The minimum role ID required (1=Expert, 2=Team Member, 3=Scrum Master, 4=Guest)
 */
const requireRole = (requiredRoleId) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      // Check if user has required role or higher privileges (lower roleId)
      if (req.user.roleId > requiredRoleId) {
        return res.status(403).json({ 
          success: false, 
          error: 'Insufficient permissions',
          required: getRoleName(requiredRoleId),
          current: getRoleName(req.user.roleId)
        });
      }

      next();
    } catch (error) {
      console.error('Role middleware error:', error);
      res.status(500).json({ success: false, error: 'Authorization failed' });
    }
  };
};

/**
 * Helper function to get role name from roleId
 */
const getRoleName = (roleId) => {
  const roles = {
    1: 'Expert',
    2: 'Team Member', 
    3: 'Scrum Master',
    4: 'Guest'
  };
  return roles[roleId] || 'Unknown';
};

/**
 * Middleware to check if user is an expert (roleId = 1)
 */
const requireExpert = requireRole(1);

/**
 * Middleware to check if user has at least team member privileges (roleId <= 3)
 * Allows Expert (1), Team Member (2), or Scrum Master (3), but not Guest (4)
 */
const requireTeamMember = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Allow Expert (1), Team Member (2), or Scrum Master (3), but not Guest (4)
    if (req.user.roleId > 3) {
      return res.status(403).json({ 
        success: false, 
        error: 'Team member access required',
        current: getRoleName(req.user.roleId),
        required: 'Team Member or higher'
      });
    }

    next();
  } catch (error) {
    console.error('Team member middleware error:', error);
    res.status(500).json({ success: false, error: 'Authorization failed' });
  }
};

/**
 * Middleware to check if user can manage teams (Expert or Team Member)
 * Allows Expert (1) and Team Member (2), but not Scrum Master (3) or Guest (4)
 */
const requireTeamManager = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Allow Expert (1) and Team Member (2) only
    if (req.user.roleId > 2) {
      return res.status(403).json({ 
        success: false, 
        error: 'Team management privileges required',
        current: getRoleName(req.user.roleId),
        required: 'Team Member or Expert'
      });
    }

    next();
  } catch (error) {
    console.error('Team manager middleware error:', error);
    res.status(500).json({ success: false, error: 'Authorization failed' });
  }
};

module.exports = {
  requireAuth,
  requireRole,
  requireExpert,
  requireTeamMember,
  requireTeamManager,
  getRoleName
};