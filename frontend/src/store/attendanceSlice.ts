import { createSlice, createSelector, type PayloadAction } from '@reduxjs/toolkit';
import type { AttendanceRecord, AttendanceStatus, Student } from '../api/types';
import {
  execute, undo as undoCmd, record, stepBack, stepForward, emptyHistory,
  type AttendanceCommand, type History, type Marks,
} from './attendanceCommands';
import { todayIso } from '../lib/fp';

export interface AttendanceState {
  classId: number | null;
  date: string;
  roster: Student[];
  marks: Marks;
  savedMarks: Marks;
  history: History;
  status: 'idle' | 'loading' | 'ready' | 'saving' | 'error';
  error: string | null;
  lastSavedAt: string | null;
}

export const initialAttendanceState: AttendanceState = {
  classId: null, date: todayIso(), roster: [], marks: {}, savedMarks: {}, history: emptyHistory,
  status: 'idle', error: null, lastSavedAt: null,
};

const toMarks = (records: AttendanceRecord[]): Marks => Object.fromEntries(records.map((r) => [r.studentId, r.status]));

const slice = createSlice({
  name: 'attendance',
  initialState: initialAttendanceState,
  reducers: {
    // "Actions" in NgRx terms. Reducers stay pure; side effects live in listeners (effects.ts).
    selectionChanged: (s, a: PayloadAction<{ classId: number; date: string }>) => {
      s.classId = a.payload.classId; s.date = a.payload.date; s.status = 'loading'; s.error = null;
    },
    rosterLoaded: (s, a: PayloadAction<{ roster: Student[]; records: AttendanceRecord[] }>) => {
      s.roster = a.payload.roster;
      s.marks = s.savedMarks = toMarks(a.payload.records);
      s.history = emptyHistory; s.status = 'ready';
    },
    loadFailed: (s, a: PayloadAction<string>) => { s.status = 'error'; s.error = a.payload; },
    commandApplied: (s, a: PayloadAction<AttendanceCommand>) => {
      s.marks = execute(s.marks, a.payload);
      s.history = record(s.history, a.payload);
    },
    undo: (s) => {
      const { cmd, history } = stepBack(s.history);
      if (cmd) { s.marks = undoCmd(s.marks, cmd); s.history = history; }
    },
    redo: (s) => {
      const { cmd, history } = stepForward(s.history);
      if (cmd) { s.marks = execute(s.marks, cmd); s.history = history; }
    },
    saveRequested: (s) => { s.status = 'saving'; s.error = null; },
    saveSucceeded: (s, a: PayloadAction<string>) => { s.status = 'ready'; s.savedMarks = s.marks; s.lastSavedAt = a.payload; },
    saveFailed: (s, a: PayloadAction<string>) => { s.status = 'ready'; s.error = a.payload; },
  },
});

export const attendanceActions = slice.actions;
export const attendanceReducer = slice.reducer;

// Selectors. createSelector memoizes: the result is recomputed only when inputs change,
// so components that use it do not re-render needlessly.
type Root = { attendance: AttendanceState };
export const selectAttendance = (s: Root) => s.attendance;
export const selectMarks = (s: Root) => s.attendance.marks;
export const selectRoster = (s: Root) => s.attendance.roster;
const selectSaved = (s: Root) => s.attendance.savedMarks;

export const selectCounts = createSelector([selectRoster, selectMarks], (roster, marks) =>
  roster.reduce<Record<AttendanceStatus | 'unmarked', number>>(
    (acc, st) => { acc[marks[st.id] ?? 'unmarked'] += 1; return acc; },
    { present: 0, late: 0, absent: 0, unmarked: 0 },
  ));

export const selectUnsavedCount = createSelector([selectMarks, selectSaved], (marks, saved) =>
  Object.keys(marks).filter((id) => marks[+id] !== saved[+id]).length);

export const selectCanUndo = (s: Root) => s.attendance.history.past.length > 0;
export const selectCanRedo = (s: Root) => s.attendance.history.future.length > 0;
