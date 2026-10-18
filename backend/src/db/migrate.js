// Run with: npm run migrate
import { migrate, pool } from './index.js';

migrate()
  .then(() => console.log('Migration complete'))
  .catch((err) => {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
