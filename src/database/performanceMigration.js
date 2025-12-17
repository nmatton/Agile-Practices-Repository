const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function runPerformanceMigration() {
  console.log('Starting performance optimization migration...');
  
  try {
    // Read the performance indexes SQL file
    const sqlPath = path.join(__dirname, '../../sql/performance_indexes.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split by semicolon and filter out empty statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`Executing ${statements.length} performance optimization statements...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        await pool.query(statement);
        console.log(`✓ Statement ${i + 1} completed successfully`);
      } catch (error) {
        // Log error but continue with other statements
        console.error(`✗ Statement ${i + 1} failed:`, error.message);
        
        // If it's a "relation already exists" error, that's okay
        if (!error.message.includes('already exists')) {
          console.error('Statement content:', statement.substring(0, 100) + '...');
        }
      }
    }
    
    // Verify some key indexes were created
    const indexCheckQuery = `
      SELECT 
        indexname,
        tablename,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname
    `;
    
    const indexResult = await pool.query(indexCheckQuery);
    console.log(`\n✓ Performance migration completed. ${indexResult.rows.length} indexes found.`);
    
    // Show created indexes
    console.log('\nCreated/Verified Indexes:');
    indexResult.rows.forEach(row => {
      console.log(`  - ${row.indexname} on ${row.tablename}`);
    });
    
    return {
      success: true,
      indexCount: indexResult.rows.length,
      message: 'Performance optimization migration completed successfully'
    };
    
  } catch (error) {
    console.error('Performance migration failed:', error);
    return {
      success: false,
      error: error.message,
      message: 'Performance optimization migration failed'
    };
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runPerformanceMigration()
    .then(result => {
      console.log('\nMigration Result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Migration error:', error);
      process.exit(1);
    });
}

module.exports = { runPerformanceMigration };