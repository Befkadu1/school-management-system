import { attendanceActions } from '../attendanceSlice';
import type { AppStartListening } from './types';

export const registerAttendanceEffects = (start: AppStartListening): void => {
  // Picking a class or a date loads that sheet. A newer pick abandons the older request.
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

  // The whole sheet goes up in one request, not one per mark.
  start({
    actionCreator: attendanceActions.saveRequested,
    effect: async (_action, api) => {
      const { date, marks } = api.getState().attendance;
      const records = Object.entries(marks).map(([id, status]) => ({ studentId: Number(id), status }));
      try {
        await api.extra.api.saveAttendance(date, records);
        // The timestamp is read here, not in the reducer, which must stay pure.
        api.dispatch(attendanceActions.saveSucceeded(new Date().toISOString()));
      } catch (e) {
        api.dispatch(attendanceActions.saveFailed((e as Error).message));
      }
    },
  });
};
