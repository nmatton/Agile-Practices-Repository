const pool = require('../config/database');

/**
 * Comprehensive cleanup function that handles all foreign key constraints
 * in the correct order to avoid deadlocks and constraint violations
 */
async function cleanupTestData(emailPattern = '%test_%') {
  try {
    // Start a transaction to ensure atomicity
    await pool.query('BEGIN');

    // 1. Clean up records that reference Person but don't have CASCADE DELETE
    await pool.query("DELETE FROM practiceDifficultyFlag WHERE personid IN (SELECT id FROM Person WHERE email LIKE $1)", [emailPattern]);
    await pool.query("DELETE FROM personpracticeaffinity WHERE personid IN (SELECT id FROM Person WHERE email LIKE $1)", [emailPattern]);
    await pool.query("DELETE FROM affinitysurveyresults WHERE personid IN (SELECT id FROM Person WHERE email LIKE $1)", [emailPattern]);
    await pool.query("DELETE FROM bfprofile WHERE personid IN (SELECT id FROM Person WHERE email LIKE $1)", [emailPattern]);
    await pool.query("DELETE FROM teammember WHERE personid IN (SELECT id FROM Person WHERE email LIKE $1)", [emailPattern]);
    
    // 2. Clean up experiencefeedback if it exists
    try {
      await pool.query("DELETE FROM experiencefeedback WHERE personid IN (SELECT id FROM Person WHERE email LIKE $1)", [emailPattern]);
      await pool.query("DELETE FROM experiencefeedback WHERE validatedby IN (SELECT id FROM Person WHERE email LIKE $1)", [emailPattern]);
    } catch (error) {
      // Table might not exist yet, ignore error
      if (!error.message.includes('does not exist')) {
        throw error;
      }
    }
    
    // 2.1 Clean up any remaining affinitysurveyresults that might be missed
    try {
      await pool.query("DELETE FROM affinitysurveyresults WHERE personid IN (SELECT id FROM Person WHERE email LIKE $1)", [emailPattern]);
    } catch (error) {
      // Already cleaned up above, but try again in case of race conditions
    }
    
    // 3. Update records that reference Person via lastUpdateById to NULL
    await pool.query("UPDATE practiceversion SET lastupdatebyid = NULL WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1)", [emailPattern]);
    await pool.query("UPDATE methodversion SET lastupdatebyid = NULL WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1)", [emailPattern]);
    await pool.query("UPDATE activity SET lastupdatebyid = NULL WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1)", [emailPattern]);
    await pool.query("UPDATE workproduct SET lastupdatebyid = NULL WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1)", [emailPattern]);
    await pool.query("UPDATE role SET lastupdatebyid = NULL WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1)", [emailPattern]);
    await pool.query("UPDATE metric SET lastupdatebyid = NULL WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1)", [emailPattern]);
    await pool.query("UPDATE guideline SET lastupdatebyid = NULL WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1)", [emailPattern]);
    await pool.query("UPDATE pitfall SET lastupdatebyid = NULL WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1)", [emailPattern]);
    await pool.query("UPDATE benefit SET lastupdatebyid = NULL WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1)", [emailPattern]);
    await pool.query("UPDATE recommendation SET lastupdatebyid = NULL WHERE lastupdatebyid IN (SELECT id FROM Person WHERE email LIKE $1)", [emailPattern]);
    
    // 4. Finally delete Person records
    await pool.query("DELETE FROM Person WHERE email LIKE $1", [emailPattern]);
    
    // Commit the transaction
    await pool.query('COMMIT');
  } catch (error) {
    // Rollback on error
    await pool.query('ROLLBACK');
    throw error;
  }
}

/**
 * Clean up test teams and related data
 */
async function cleanupTestTeams(namePattern = 'Test%') {
  try {
    await pool.query('BEGIN');
    
    // Clean up team-related data
    await pool.query('DELETE FROM teammember WHERE teamid IN (SELECT id FROM team WHERE name LIKE $1)', [namePattern]);
    await pool.query('DELETE FROM universe WHERE teamid IN (SELECT id FROM team WHERE name LIKE $1)', [namePattern]);
    await pool.query('DELETE FROM team WHERE name LIKE $1', [namePattern]);
    
    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

/**
 * Clean up test practices and related data
 */
async function cleanupTestPractices(namePattern = '%Test%') {
  try {
    await pool.query('BEGIN');
    
    // Clean up practice-related data in correct order
    await pool.query('DELETE FROM practiceversion WHERE practiceid IN (SELECT id FROM practice WHERE name LIKE $1)', [namePattern]);
    await pool.query('DELETE FROM practice WHERE name LIKE $1', [namePattern]);
    
    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

module.exports = {
  cleanupTestData,
  cleanupTestTeams,
  cleanupTestPractices
};