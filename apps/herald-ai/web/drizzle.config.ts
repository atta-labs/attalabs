import { defineConfig } from 'drizzle-kit'

// drizzle-kit doesn't load .env.local automatically — load it explicitly
import { config } from 'dotenv'
config({ path: '.env.local' })

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!
  }
})
