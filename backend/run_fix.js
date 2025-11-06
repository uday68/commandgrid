import { Pool } from 'pg';
import fs from 'fs';

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'pmt',
  password: 'newpassword',
  port: 5433,
});

async function runFix() {
  try {
    console.log('Reading fix script...');
    const fixScript = fs.readFileSync('fix_audit_trigger.sql', 'utf8');
    
    console.log('Executing fix script...');
    await pool.query(fixScript);
    
    console.log('✅ Trigger function fixed successfully!');
    
    // Verify the fix
    console.log('Verifying the fix...');
    const result = await pool.query(`
      SELECT proname, prosrc 
      FROM pg_proc 
      WHERE proname = 'log_user_status'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ New function created successfully');
      console.log('Function body preview:');
      console.log(result.rows[0].prosrc.substring(0, 200) + '...');
    } else {
      console.log('❌ Function not found after fix');
    }
    
  } catch (error) {
    console.error('❌ Error fixing trigger:', error.message);
  } finally {
    await pool.end();
  }
}

runFix();
