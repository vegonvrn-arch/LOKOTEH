import pool from './connection.js'

export async function initializeDatabase() {
  const client = await pool.connect()

  try {
    console.log('Initializing database...')

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✓ Users table created')

    // Create projects table
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✓ Projects table created')

    // Create segments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS segments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        code VARCHAR(255) NOT NULL,
        title VARCHAR(255),
        details TEXT,
        top NUMERIC NOT NULL,
        left NUMERIC NOT NULL,
        width NUMERIC NOT NULL,
        height NUMERIC NOT NULL,
        color VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✓ Segments table created')

    // Create polylines table
    await client.query(`
      CREATE TABLE IF NOT EXISTS polylines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        label VARCHAR(255) NOT NULL,
        description TEXT,
        color VARCHAR(50) NOT NULL,
        stroke_width NUMERIC NOT NULL,
        dash_style VARCHAR(50) NOT NULL,
        points JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✓ Polylines table created')

    // Create wheel_polylines table
    await client.query(`
      CREATE TABLE IF NOT EXISTS wheel_polylines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        label VARCHAR(255) NOT NULL,
        description TEXT,
        color VARCHAR(50) NOT NULL,
        stroke_width NUMERIC NOT NULL,
        dash_style VARCHAR(50) NOT NULL,
        points JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✓ Wheel polylines table created')

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
      CREATE INDEX IF NOT EXISTS idx_segments_project_id ON segments(project_id);
      CREATE INDEX IF NOT EXISTS idx_polylines_project_id ON polylines(project_id);
      CREATE INDEX IF NOT EXISTS idx_wheel_polylines_project_id ON wheel_polylines(project_id);
    `)
    console.log('✓ Indexes created')

    console.log('Database initialized successfully!')
  } catch (error) {
    console.error('Database initialization failed:', error)
    throw error
  } finally {
    client.release()
  }
}
