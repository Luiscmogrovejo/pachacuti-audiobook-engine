// src/lib/db/connection.ts -- PostgreSQL connection via postgres.js
// Zero native dependencies, works in Docker without compilation

import postgres from 'postgres'

const connectionString = import.meta.env.DATABASE_URL || 'postgres://localhost:5432/pachacuti'

export const sql = postgres(connectionString, {
  max: 10,            // max connections in pool
  idle_timeout: 20,   // close idle connections after 20s
  connect_timeout: 10, // 10s connection timeout
})
