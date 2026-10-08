import type { SchoolApi } from '../api/school-api';

/** Dependencies injected into thunks and effects, so tests can pass a fake API. */
export interface ThunkExtra { api: SchoolApi }
