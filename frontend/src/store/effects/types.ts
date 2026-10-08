import type { TypedStartListening } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from '../index';
import type { ThunkExtra } from '../extra';

/**
 * What each feature's effects file is handed: a `startListening` that already
 * knows the app's state, dispatch and injected dependencies.
 */
export type AppStartListening = TypedStartListening<RootState, AppDispatch, ThunkExtra>;

export interface EffectOptions {
  /** Overridden in tests so typing can be simulated without a real wait. */
  searchDebounceMs?: number;
}
