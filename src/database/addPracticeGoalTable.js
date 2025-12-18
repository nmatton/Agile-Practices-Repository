const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function addPracticeGoalTable() {
  try {
    console.log('Adding practiceGoal table...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../../sql/add_practice_goal_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await pool.query(sql);
    
    console.log('practiceGoal table added successfully!');
    
    // Verify table was created
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'practicegoal'
      ORDER BY ordinal_position;
    `);
    
    console.log('practiceGoal table columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
  } catch (error) {
    console.error('Failed to add practiceGoal table:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  addPracticeGoalTable()
    .then(() => {
      console.log('Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { addPracticeGoalTable };