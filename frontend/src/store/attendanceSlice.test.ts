import { describe, it, expect } from 'vitest';
import { attendanceReducer, attendanceActions as A, initialAttendanceState, selectCounts, selectUnsavedCount } from './attendanceSlice';
import { markCommand } from './attendanceCommands';
import type { Student } from '../api/types';

const student = (id: number): Student => ({ id, firstName: 'S', fatherName: 'F', grandfatherName: 'G', gender: 'F', classId: 1, guardianName: '', guardianPhone: '', enrolledAt: '' });
const loaded = attendanceReducer(initialAttendanceState, A.rosterLoaded({
  roster: [student(1), student(2), student(3)], records: [{ studentId: 1, date: '2026-10-07', status: 'present' }],
}));

describe('attendance reducer and selectors', () => {
  it('applies, undoes and redoes commands', () => {
    const marked = attendanceReducer(loaded, A.commandApplied(markCommand(loaded.marks, 2, 'absent')));
    expect(marked.marks[2]).toBe('absent');
    const undone = attendanceReducer(marked, A.undo());
    expect(undone.marks[2]).toBeUndefined();
    expect(attendanceReducer(undone, A.redo()).marks[2]).toBe('absent');
  });

  it('counts marks and unsaved changes', () => {
    const state = { attendance: attendanceReducer(loaded, A.commandApplied(markCommand(loaded.marks, 3, 'late'))) };
    expect(selectCounts(state)).toEqual({ present: 1, late: 1, absent: 0, unmarked: 1 });
    expect(selectUnsavedCount(state)).toBe(1);
  });

  it('memoized selectors return the same object for the same state', () => {
    const state = { attendance: loaded };
    expect(selectCounts(state)).toBe(selectCounts(state));
  });

  it('saving makes the current marks the saved baseline', () => {
    const marked = attendanceReducer(loaded, A.commandApplied(markCommand(loaded.marks, 3, 'late')));
    const saved = attendanceReducer(marked, A.saveSucceeded('now'));
    expect(selectUnsavedCount({ attendance: saved })).toBe(0);
  });
});
