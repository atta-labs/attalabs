import { createDb } from '@atta/db'
import * as schema from './schema'

export const db = createDb(process.env.DATABASE_URL!, schema)
export { schema }
