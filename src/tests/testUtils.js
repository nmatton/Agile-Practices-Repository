const pool = require('../config/database');

/**
 * Comprehensive cleanup function that handles all foreign key constraints
 * in the correct order to avoid deadlocks and constraint violations
 */
async function cleanupTestData(emailPattern = '%test_%') {
  try {
    // Disable foreign key checks temporarily for cleanup
    await pool.query('SET session_replication_role = replica');
    
    // Clean up all test data
    const cleanupQueries = [
      // Experience feedback (if exists)
      "DELETE FROM experiencefeedback WHERE personid IN (SELECT id FROM Person WHERE email LIKE $1) OR validatedby IN (SELECT id FROM Person WHERE email LIKE $1)",
      
      // Level 4 tables (most dependent)
      "DELETE FROM recommendationgoal WHERE recommendationid IN (SELECT id FROM recommendation WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1))",
      "DELETE FROM practiceassociation WHERE sourcepracticeversionid IN (SELECT id FROM practiceversion WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1)) OR targetpracticeversionid IN (SELECT id FROM practiceversion WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1))",
      
      // Level 3 tables (associations and details)
      "DELETE FROM practiceDifficultyFlag WHERE personid IN (SELECT id FROM Person WHERE email LIKE $1)",
      "DELETE FROM PracticeVersionUniverse WHERE practiceversionid IN (SELECT id FROM practiceversion WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1))",
      "DELETE FROM affinityPractice WHERE practiceversionid IN (SELECT id FROM practiceversion WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1))",
      "DELETE FROM personpracticeaffinity WHERE personid IN (SELECT id FROM Person WHERE email LIKE $1)",
      "DELETE FROM recommendation WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1)",
      "DELETE FROM completioncriteria WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1)",
      "DELETE FROM benefit WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1)",
      "DELETE FROM pitfall WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1)",
      "DELETE FROM guideline WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1)",
      "DELETE FROM workproductpractice WHERE practiceversionid IN (SELECT id FROM practiceversion WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1))",
      "DELETE FROM roleuse WHERE practiceversionid IN (SELECT id FROM practiceversion WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1))",
      "DELETE FROM metricpractice WHERE practiceversionid IN (SELECT id FROM practiceversion WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1))",
      "DELETE FROM practiceversionactivity WHERE practiceversionid IN (SELECT id FROM practiceversion WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1))",
      "DELETE FROM practicemethod WHERE practiceversionid IN (SELECT id FROM practiceversion WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1)) OR methodversionid IN (SELECT id FROM methodversion WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1))",
      
      // Level 2 tables (direct Person dependencies)
      "DELETE FROM affinitysurveyresults WHERE personid IN (SELECT id FROM Person WHERE email LIKE $1)",
      "DELETE FROM methodversion WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1)",
      "DELETE FROM practiceversion WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1)",
      "DELETE FROM bfprofile WHERE personid IN (SELECT id FROM Person WHERE email LIKE $1)",
      "DELETE FROM teammember WHERE personid IN (SELECT id FROM Person WHERE email LIKE $1)",
      
      // Set lastUpdateById to NULL for records that reference Person
      "UPDATE activity SET lastupdatebyid = NULL WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1)",
      "UPDATE workproduct SET lastupdatebyid = NULL WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1)",
      "UPDATE role SET lastupdatebyid = NULL WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1)",
      "UPDATE metric SET lastupdatebyid = NULL WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1)",
      "UPDATE practice SET lastupdatebyid = NULL WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1)",
      "UPDATE method SET lastupdatebyid = NULL WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1)",
      
      // Finally delete Person records
      "DELETE FROM Person WHERE email LIKE $1"
    ];
    
    for (const query of cleanupQueries) {
      try {
        await pool.query(query, [emailPattern]);
      } catch (error) {
        // Ignore errors for tables that might not exist
        if (!error.message.includes('does not exist')) {
          console.warn('Cleanup query failed:', query, error.message);
        }
      }
    }
    
    // Re-enable foreign key checks
    await pool.query('SET session_replication_role = DEFAULT');
    
  } catch (error) {
    // Re-enable foreign key checks on error
    try {
      await pool.query('SET session_replication_role = DEFAULT');
    } catch (resetError) {
      console.error('Failed to reset foreign key checks:', resetError);
    }
    console.error('Cleanup failed:', error);
    throw error;
  }
}

/**
 * Clean up test teams and related data
 */
async function cleanupTestTeams(namePattern = 'Test%') {
  try {
    // Disable foreign key checks temporarily
    await pool.query('SET session_replication_role = replica');
    
    // Clean up team-related data
    await pool.query('DELETE FROM teammember WHERE teamid IN (SELECT id FROM team WHERE name LIKE $1)', [namePattern]);
    await pool.query('DELETE FROM universe WHERE teamid IN (SELECT id FROM team WHERE name LIKE $1)', [namePattern]);
    await pool.query('DELETE FROM team WHERE name LIKE $1', [namePattern]);
    
    // Re-enable foreign key checks
    await pool.query('SET session_replication_role = DEFAULT');
  } catch (error) {
    try {
      await pool.query('SET session_replication_role = DEFAULT');
    } catch (resetError) {
      console.error('Failed to reset foreign key checks:', resetError);
    }
    throw error;
  }
}

/**
 * Clean up test practices and related data
 */
async function cleanupTestPractices(namePattern = '%Test%') {
  try {
    // Disable foreign key checks temporarily
    await pool.query('SET session_replication_role = replica');
    
    // Clean up practice-related data in correct order
    await pool.query('DELETE FROM practiceversion WHERE practiceid IN (SELECT id FROM practice WHERE name LIKE $1)', [namePattern]);
    await pool.query('DELETE FROM practice WHERE name LIKE $1', [namePattern]);
    
    // Re-enable foreign key checks
    await pool.query('SET session_replication_role = DEFAULT');
  } catch (error) {
    try {
      await pool.query('SET session_replication_role = DEFAULT');
    } catch (resetError) {
      console.error('Failed to reset foreign key checks:', resetError);
    }
    throw error;
  }
}

module.exports = {
  cleanupTestData,
  cleanupTestTeams,
  cleanupTestPractices
};