import { createDb } from '@atta/db'
import * as schema from './schema'

type DbInstance = ReturnType<typeof createDb>

let _db: DbInstance | undefined

function getDb(): DbInstance {
  if (!_db) {
    _db = createDb(process.env.DATABASE_URL!, schema)
  }
  return _db
}

export const db = new Proxy({} as DbInstance, {
  get(_, prop) {
    return Reflect.get(getDb(), prop)
  }
})
export { schema }
