import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { studentsActions, createStudent } from './studentsSlice';
import { attendanceActions } from './attendanceSlice';
import type { ThunkExtra } from './extra';
import type { RootState, AppDispatch } from './index';

/**
 * Effects (NgRx term) = listeners that react to actions and run side effects,
 * then dispatch new actions with the result. Components only dispatch intent.
 */
export const createEffects = (extra: ThunkExtra, { searchDebounceMs = 300 } = {}) => {
  const listener = createListenerMiddleware({ extra });
  const start = listener.startListening.withTypes<RootState, AppDispatch, ThunkExtra>();

  // Search as you type: debounce, and cancel the previous search if a new key is pressed (like switchMap).
  start({
    matcher: isAnyOf(studentsActions.searchChanged, studentsActions.classFilterChanged, studentsActions.loadRequested, createStudent.fulfilled),
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

  start({
    actionCreator: attendanceActions.selectionChanged,
    effect: async ({ payload: { classId, date } }, api) => {
      api.cancelActiveListeners();
      try {
        const [roster, records] = await Promise.all([
          api.extra.api.students({ classId, limit: 500 }),
          api.extra.api.attendance(classId, date),
        ]);
        api.dispatch(attendanceActions.rosterLoaded({ roster: roster.items, records }));
      } catch (e) {
        api.dispatch(attendanceActions.loadFailed((e as Error).message));
      }
    },
  });

  start({
    actionCreator: attendanceActions.saveRequested,
    effect: async (_action, api) => {
      const { date, marks } = api.getState().attendance;
      const records = Object.entries(marks).map(([id, status]) => ({ studentId: Number(id), status }));
      try {
        await api.extra.api.saveAttendance(date, records);
        api.dispatch(attendanceActions.saveSucceeded(new Date().toISOString()));
      } catch (e) {
        api.dispatch(attendanceActions.saveFailed((e as Error).message));
      }
    },
  });

  return listener;
};
