import { describe, it, expect, vi } from 'vitest';
import { makeStore } from './index';
import { studentsActions } from './studentsSlice';
import { attendanceActions } from './attendanceSlice';
import { markCommand } from './attendanceCommands';
import type { SchoolApi } from '../api/schoolApi';
import type { Student } from '../api/types';

const student = (id: number, firstName: string): Student => ({ id, firstName, fatherName: 'Tesfaye', grandfatherName: 'Haile', gender: 'F', classId: 1, guardianName: '', guardianPhone: '', enrolledAt: '' });

const fakeApi = (overrides: Partial<SchoolApi> = {}): SchoolApi => ({
  students: vi.fn(async ({ search }: { search?: string }) => {
    const all = [student(1, 'Hana'), student(2, 'Abel')];
    const items = all.filter((s) => !search || s.firstName.toLowerCase().includes(search.toLowerCase()));
    return { items, total: items.length };
  }),
  attendance: vi.fn(async () => []),
  saveAttendance: vi.fn(async (_date: string, records: unknown[]) => ({ saved: records.length })),
  ...overrides,
} as unknown as SchoolApi);

const settle = () => new Promise((r) => setTimeout(r, 30));

describe('effects (listener middleware)', () => {
  it('debounces typing: only the last search hits the API', async () => {
    const api = fakeApi();
    const store = makeStore(api, { searchDebounceMs: 10 });
    'Han'.split('').forEach((_, i) => store.dispatch(studentsActions.searchChanged('Han'.slice(0, i + 1))));
    await settle();
    expect(api.students).toHaveBeenCalledTimes(1);
    expect(api.students).toHaveBeenCalledWith(expect.objectContaining({ search: 'Han' }));
    expect(store.getState().students.ids).toEqual([1]);
  });

  it('loads the roster when the class changes, and saves marks', async () => {
    const api = fakeApi();
    const store = makeStore(api);
    store.dispatch(attendanceActions.selectionChanged({ classId: 1, date: '2026-10-07' }));
    await settle();
    expect(store.getState().attendance.roster).toHaveLength(2);

    store.dispatch(attendanceActions.commandApplied(markCommand({}, 1, 'absent')));
    store.dispatch(attendanceActions.saveRequested());
    await settle();
    expect(api.saveAttendance).toHaveBeenCalledWith('2026-10-07', [{ studentId: 1, status: 'absent' }]);
    expect(store.getState().attendance.lastSavedAt).not.toBeNull();
  });

  it('surfaces save errors without losing the marks', async () => {
    const api = fakeApi({ saveAttendance: vi.fn(async () => { throw new Error('Server is down'); }) });
    const store = makeStore(api);
    store.dispatch(attendanceActions.commandApplied(markCommand({}, 1, 'late')));
    store.dispatch(attendanceActions.saveRequested());
    await settle();
    expect(store.getState().attendance.error).toBe('Server is down');
    expect(store.getState().attendance.marks[1]).toBe('late');
  });
});
