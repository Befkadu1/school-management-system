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
  /** What the server last confirmed. The unsaved badge is marks minus this. */
  savedMarks: Marks;
  history: History;
  status: 'idle' | 'loading' | 'ready' | 'saving' | 'error';
  error: string | null;
  lastSavedAt: string | null;
}

export const initialAttendanceState: AttendanceState = {
  classId: null,
  date: todayIso(),
  roster: [],
  marks: {},
  savedMarks: {},
  history: emptyHistory,
  status: 'idle',
  error: null,
  lastSavedAt: null,
};

const toMarks = (records: AttendanceRecord[]): Marks =>
  Object.fromEntries(records.map((entry) => [entry.studentId, entry.status]));

const slice = createSlice({
  name: 'attendance',
  initialState: initialAttendanceState,
  reducers: {
    // "Actions" in NgRx terms. Reducers stay pure; side effects live in listeners (effects/).
    selectionChanged: (state, action: PayloadAction<{ classId: number; date: string }>) => {
      state.classId = action.payload.classId;
      state.date = action.payload.date;
      state.status = 'loading';
      state.error = null;
    },
    rosterLoaded: (state, action: PayloadAction<{ roster: Student[]; records: AttendanceRecord[] }>) => {
      state.roster = action.payload.roster;
      state.marks = state.savedMarks = toMarks(action.payload.records);
      state.history = emptyHistory;
      state.status = 'ready';
    },
    loadFailed: (state, action: PayloadAction<string>) => {
      state.status = 'error';
      state.error = action.payload;
    },
    commandApplied: (state, action: PayloadAction<AttendanceCommand>) => {
      state.marks = execute(state.marks, action.payload);
      state.history = record(state.history, action.payload);
    },
    undo: (state) => {
      const { cmd, history } = stepBack(state.history);
      if (cmd) {
        state.marks = undoCmd(state.marks, cmd);
        state.history = history;
      }
    },
    redo: (state) => {
      const { cmd, history } = stepForward(state.history);
      if (cmd) {
        state.marks = execute(state.marks, cmd);
        state.history = history;
      }
    },
    saveRequested: (state) => {
      state.status = 'saving';
      state.error = null;
    },
    saveSucceeded: (state, action: PayloadAction<string>) => {
      state.status = 'ready';
      state.savedMarks = state.marks;
      state.lastSavedAt = action.payload;
    },
    saveFailed: (state, action: PayloadAction<string>) => {
      state.status = 'ready';
      state.error = action.payload;
    },
  },
});

export const attendanceActions = slice.actions;
export const attendanceReducer = slice.reducer;

// Selectors. createSelector memoizes: the result is recomputed only when inputs change,
// so components that use it do not re-render needlessly.
type Root = { attendance: AttendanceState };

export const selectAttendance = (state: Root) => state.attendance;
export const selectMarks = (state: Root) => state.attendance.marks;
export const selectRoster = (state: Root) => state.attendance.roster;
const selectSavedMarks = (state: Root) => state.attendance.savedMarks;

export const selectCounts = createSelector([selectRoster, selectMarks], (roster, marks) =>
  roster.reduce<Record<AttendanceStatus | 'unmarked', number>>(
    (counts, student) => {
      counts[marks[student.id] ?? 'unmarked'] += 1;
      return counts;
    },
    { present: 0, late: 0, absent: 0, unmarked: 0 },
  ));

export const selectUnsavedCount = createSelector([selectMarks, selectSavedMarks], (marks, savedMarks) =>
  Object.keys(marks).filter((id) => marks[+id] !== savedMarks[+id]).length);

export const selectCanUndo = (state: Root) => state.attendance.history.past.length > 0;
export const selectCanRedo = (state: Root) => state.attendance.history.future.length > 0;
