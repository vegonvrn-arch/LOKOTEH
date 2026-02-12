import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

// Support both DATABASE_URL (for Supabase) and individual connection params
const pool = new Pool(
  process.env.DATABASE_URL ? {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  } : {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'depo2_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  }
)

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
})

export default pool
