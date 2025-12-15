const pool = require('../config/database');
const redisClient = require('../config/redis');

/**
 * Validates that the system is properly configured and ready to run
 */
async function validateSystemSetup() {
  const results = {
    database: false,
    redis: false,
    schema: false,
    errors: []
  };

  try {
    // Test database connection
    await pool.query('SELECT 1');
    results.database = true;
    console.log('✓ Database connection successful');
  } catch (error) {
    results.errors.push(`Database connection failed: ${error.message}`);
    console.error('✗ Database connection failed:', error.message);
  }

  try {
    // Test Redis connection
    await redisClient.ping();
    results.redis = true;
    console.log('✓ Redis connection successful');
  } catch (error) {
    results.errors.push(`Redis connection failed: ${error.message}`);
    console.error('✗ Redis connection failed:', error.message);
  }

  try {
    // Check if essential tables exist
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('person', 'team', 'practice', 'practiceversion')
      ORDER BY table_name;
    `);
    
    const expectedTables = ['person', 'practice', 'practiceversion', 'team'];
    const existingTables = tableCheck.rows.map(row => row.table_name);
    
    if (expectedTables.every(table => existingTables.includes(table))) {
      results.schema = true;
      console.log('✓ Database schema validation successful');
      console.log(`  Found tables: ${existingTables.join(', ')}`);
    } else {
      const missingTables = expectedTables.filter(table => !existingTables.includes(table));
      results.errors.push(`Missing database tables: ${missingTables.join(', ')}`);
      console.error('✗ Database schema validation failed');
      console.error(`  Missing tables: ${missingTables.join(', ')}`);
    }
  } catch (error) {
    results.errors.push(`Schema validation failed: ${error.message}`);
    console.error('✗ Schema validation failed:', error.message);
  }

  return results;
}

module.exports = { validateSystemSetup };