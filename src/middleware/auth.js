const Person = require('../models/Person');

/**
 * Middleware to check if user is authenticated
 */
const requireAuth = async (req, res, next) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Fetch user details and attach to request
    const user = await Person.findById(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Middleware to check if user has a specific role
 * @param {number} requiredRoleId - The role ID required (1=Expert, 2=Team Member, 3=Scrum Master, 4=Guest)
 */
const requireRole = (requiredRoleId) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (req.user.roleId !== requiredRoleId) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      console.error('Role middleware error:', error);
      res.status(500).json({ error: 'Authorization failed' });
    }
  };
};

/**
 * Middleware to check if user is an expert (roleId = 1)
 */
const requireExpert = requireRole(1);

/**
 * Middleware to check if user has at least team member privileges (roleId <= 3)
 */
const requireTeamMember = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Allow Expert (1), Team Member (2), or Scrum Master (3), but not Guest (4)
    if (req.user.roleId > 3) {
      return res.status(403).json({ error: 'Team member access required' });
    }

    next();
  } catch (error) {
    console.error('Team member middleware error:', error);
    res.status(500).json({ error: 'Authorization failed' });
  }
};

module.exports = {
  requireAuth,
  requireRole,
  requireExpert,
  requireTeamMember
};