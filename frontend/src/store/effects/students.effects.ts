import { isAnyOf } from '@reduxjs/toolkit';
import { studentsActions, createStudent } from '../students-slice';
import type { AppStartListening, EffectOptions } from './types';

/**
 * Search as you type: debounce, and cancel the previous search if another key
 * is pressed, the way switchMap would.
 */
export const registerStudentEffects = (
  start: AppStartListening,
  { searchDebounceMs = 300 }: EffectOptions = {},
): void => {
  start({
    matcher: isAnyOf(
      studentsActions.searchChanged,
      studentsActions.classFilterChanged,
      studentsActions.loadRequested,
      createStudent.fulfilled,
    ),
    effect: async (action, api) => {
      api.cancelActiveListeners();

      if (!studentsActions.loadRequested.match(action)) {
        await api.delay(searchDebounceMs);
        api.dispatch(studentsActions.loadRequested());
        return;
      }

      const { search, classId } = api.getState().students;
      try {
        const page = await api.extra.api.students({ search, classId: classId ?? undefined, limit: 500 });
        api.dispatch(studentsActions.loaded(page));
      } catch (e) {
        api.dispatch(studentsActions.loadFailed((e as Error).message));
      }
    },
  });
};
