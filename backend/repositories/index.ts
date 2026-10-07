import { createMemoryRepos } from './memory.js';
import { createDrizzleRepos } from './drizzle.js';
import { generateSeed } from '../db/seedData.js';
import { getDb } from '../db/client.js';
import { isoDate } from '../domain/fp.js';
import type { Repos } from './types.js';

/** Factory pattern: callers ask for "repos" and the config decides which implementation they get. */
export const createRepos = (env: NodeJS.ProcessEnv = process.env): Repos =>
  env.USE_MEMORY_DB === '1'
    ? createMemoryRepos(generateSeed(isoDate(new Date())))
    : createDrizzleRepos(getDb());

export type { Repos } from './types.js';
