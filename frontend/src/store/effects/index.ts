import { createListenerMiddleware } from '@reduxjs/toolkit';
import { registerAttendanceEffects } from './attendance.effects';
import { registerStudentEffects } from './students.effects';
import type { RootState, AppDispatch } from '../index';
import type { ThunkExtra } from '../extra';
import type { EffectOptions } from './types';

export type { AppStartListening, EffectOptions } from './types';

/**
 * Effects (the NgRx term) are listeners that react to an action, run a side
 * effect and dispatch the result as a new action. Reducers stay pure because
 * everything slow or impure happens here.
 *
 * This file only composes them; each feature's listeners live in its own
 * *.effects.ts. Fees, assistant and school have none — they use
 * createAsyncThunk, which carries its own pending/fulfilled/rejected actions.
 */
export const createEffects = (extra: ThunkExtra, options: EffectOptions = {}) => {
  const listener = createListenerMiddleware({ extra });
  const start = listener.startListening.withTypes<RootState, AppDispatch, ThunkExtra>();

  registerAttendanceEffects(start);
  registerStudentEffects(start, options);

  return listener;
};
