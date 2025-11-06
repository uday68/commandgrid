import { pool } from '../Config/db.js'
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  let client;
  
  try {
    console.log('Running migration: Ensure AUTH schema and tables');
    client = await pool.connect();
    
    // 1. Check if AUTH schema exists, create if it doesn't
    console.log('Checking AUTH schema...');
    await client.query(`CREATE SCHEMA IF NOT EXISTS AUTH;`);
    
    // 2. Check if AUTH.USERS table exists
    const authUsersCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
      );
    `);
    
    if (!authUsersCheck.rows[0].exists) {
      console.log('Creating AUTH.USERS table...');
      await client.query(`
        CREATE TABLE AUTH.USERS (
          ID UUID NOT NULL DEFAULT gen_random_uuid(),
          EMAIL CHARACTER VARYING(255) NOT NULL,
          CREATED_AT TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT USERS_PKEY PRIMARY KEY (ID),
          CONSTRAINT USERS_EMAIL_KEY UNIQUE (EMAIL)
        );
      `);
    } else {
      console.log('AUTH.USERS table already exists');
    }
    
    // 3. Check if PUBLIC.USERS table exists
    const publicUsersCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      );
    `);
    
    if (!publicUsersCheck.rows[0].exists) {
      console.log('Creating PUBLIC.USERS table...');
      await client.query(`
        CREATE TABLE PUBLIC.USERS (
          USER_ID UUID NOT NULL DEFAULT gen_random_uuid(),
          NAME CHARACTER VARYING(100),
          EMAIL CHARACTER VARYING(255) NOT NULL,
          USERNAME CHARACTER VARYING(50) NOT NULL,
          PASSWORD_HASH TEXT NOT NULL,
          TIME_ZONE CHARACTER VARYING(50),
          ROLE CHARACTER VARYING(50) DEFAULT 'Member'::CHARACTER VARYING,
          AGILE_METHODOLOGY BOOLEAN DEFAULT TRUE,
          PROFILE_PICTURE TEXT,
          LAST_ACTIVE TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CREATED_AT TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          REFRESH_TOKEN TEXT,
          PHONE CHARACTER VARYING(25),
          STATUS CHARACTER VARYING(20) DEFAULT 'pending'::CHARACTER VARYING,
          UPDATED_AT TIMESTAMP WITHOUT TIME ZONE,
          DELETED_AT TIMESTAMP WITH TIME ZONE,
          USER_TYPE CHARACTER VARYING(20) NOT NULL DEFAULT 'individual'::CHARACTER VARYING,
          DEPARTMENT_ID INTEGER,
          COMPANY_ID UUID,
          FIRST_NAME CHARACTER VARYING(100),
          LAST_NAME CHARACTER VARYING(100),
          PROFILE_PICTURE_URL CHARACTER VARYING(255),
          REGISTRATION_TYPE CHARACTER VARYING(20) DEFAULT 'individual'::CHARACTER VARYING,
          TERMS_ACCEPTED BOOLEAN DEFAULT FALSE,
          TERMS_ACCEPTED_AT TIMESTAMP WITH TIME ZONE,
          CONSTRAINT USERS_PKEY PRIMARY KEY (USER_ID),
          CONSTRAINT USERS_EMAIL_KEY UNIQUE (EMAIL),
          CONSTRAINT USERS_USERNAME_KEY UNIQUE (USERNAME)
        );
      `);
    } else {
      console.log('PUBLIC.USERS table already exists');
    }
    
    // 4. Check if USER_PROFILES table exists
    const userProfilesCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_profiles'
      );
    `);
    
    if (!userProfilesCheck.rows[0].exists) {
      console.log('Creating USER_PROFILES table...');
      await client.query(`
        CREATE TABLE PUBLIC.USER_PROFILES (
          USER_ID UUID NOT NULL,
          BIO TEXT,
          SKILLS JSONB DEFAULT '[]'::jsonb,
          CONSTRAINT USER_PROFILES_PKEY PRIMARY KEY (USER_ID)
        );
      `);
    } else {
      console.log('USER_PROFILES table already exists');
    }
    
    // 5. Check if AUDIT_LOGS table exists
    const auditLogsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'audit_logs'
      );
    `);
    
    if (!auditLogsCheck.rows[0].exists) {
      console.log('Creating AUDIT_LOGS table...');
      await client.query(`
        CREATE TABLE PUBLIC.AUDIT_LOGS (
          LOG_ID UUID NOT NULL DEFAULT gen_random_uuid(),
          USER_ID UUID,
          ADMIN_ID UUID,
          IP_ADDRESS TEXT,
          ACTION_TYPE TEXT,
          ACTION_DETAILS JSONB,
          USER_AGENT TEXT,
          TIMESTAMP TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT AUDIT_LOGS_PKEY PRIMARY KEY (LOG_ID)
        );
      `);
    } else {
      console.log('AUDIT_LOGS table already exists');
    }
    
    // 6. Check if ACTIVITY_LOGS table exists
    const activityLogsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'activity_logs'
      );
    `);
    
    if (!activityLogsCheck.rows[0].exists) {
      console.log('Creating ACTIVITY_LOGS table...');
      await client.query(`
        CREATE TABLE PUBLIC.ACTIVITY_LOGS (
          LOG_ID UUID NOT NULL DEFAULT gen_random_uuid(),
          USER_ID UUID,
          PROJECT_ID UUID,
          ACTION TEXT NOT NULL,
          TIMESTAMP TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT ACTIVITY_LOGS_PKEY PRIMARY KEY (LOG_ID)
        );
      `);
    } else {
      console.log('ACTIVITY_LOGS table already exists');
    }
    
    console.log('Migration completed successfully');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Run the migration
runMigration()
  .catch(err => {
    console.error('Migration error:', err);
    process.exit(1);
  });
