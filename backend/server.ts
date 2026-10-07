import { createApp } from './http/app.js';
import { createRepos } from './repositories/index.js';
import { createLlmClient } from './agent/index.js';

const port = Number(process.env.PORT ?? 4000);

if (process.env.USE_MEMORY_DB !== '1') {
  // Apply migrations and demo data on startup (fine for an MVP; use a separate job in production)
  const { runMigrations } = await import('./db/migrate.js');
  const { seedIfEmpty } = await import('./db/seed.js');
  const { getDb } = await import('./db/client.js');
  await runMigrations();
  if (await seedIfEmpty(getDb())) console.log('Seeded demo school');
}

const llm = createLlmClient();
createApp({ repos: createRepos(), llm }).listen(port, () => {
  console.log(`API on http://localhost:${port} (assistant model: ${llm.name}, db: ${process.env.USE_MEMORY_DB === '1' ? 'memory' : 'postgres'})`);
});
