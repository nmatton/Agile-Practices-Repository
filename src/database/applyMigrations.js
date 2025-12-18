const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function applyMigrations() {
  try {
    console.log('Applying database migrations...');
    
    // Apply practiceGoal table migration
    const practiceGoalMigration = fs.readFileSync(
      path.join(__dirname, '../../sql/add_practice_goal_table.sql'), 
      'utf8'
    );
    
    await pool.query(practiceGoalMigration);
    console.log('✓ practiceGoal table migration applied');
    
    // Apply experience feedback migration if it exists
    try {
      const feedbackMigration = fs.readFileSync(
        path.join(__dirname, '../../sql/add_experience_feedback.sql'), 
        'utf8'
      );
      
      await pool.query(feedbackMigration);
      console.log('✓ experienceFeedback table migration applied');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn('Experience feedback migration failed:', error.message);
      }
    }
    
    // Apply performance indexes
    try {
      const performanceIndexes = fs.readFileSync(
        path.join(__dirname, '../../sql/performance_indexes.sql'), 
        'utf8'
      );
      
      await pool.query(performanceIndexes);
      console.log('✓ Performance indexes applied');
    } catch (error) {
      console.warn('Performance indexes failed:', error.message);
    }
    
    console.log('All migrations applied successfully');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  applyMigrations()
    .then(() => {
      console.log('Migrations completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { applyMigrations };