import type { AttendanceStatus } from '../api/types';

/**
 * Undoable commands for the attendance sheet. These are the *record* of what
 * changed, kept in Redux state; the commands in core/commands/ are the
 * *transport* that carries a user's intent to a handler. A handler creates one
 * of these and dispatches it to the reducer below.
 *
 * They are plain data, because Redux state must stay serializable, and
 * execute/undo are pure functions over the marks map.
 */
export type Marks = Readonly<Record<number, AttendanceStatus>>;

export type AttendanceCommand =
  | { kind: 'mark'; studentId: number; from: AttendanceStatus | undefined; to: AttendanceStatus }
  | { kind: 'markAll'; to: AttendanceStatus; previous: Marks; studentIds: number[] };

// Command factories capture the "before" state so undo is exact.
export const markCommand = (marks: Marks, studentId: number, to: AttendanceStatus): AttendanceCommand =>
  ({ kind: 'mark', studentId, from: marks[studentId], to });

export const markAllCommand = (marks: Marks, studentIds: number[], to: AttendanceStatus): AttendanceCommand =>
  ({ kind: 'markAll', to, previous: marks, studentIds });

const without = (marks: Marks, id: number): Marks => {
  const { [id]: _removed, ...rest } = marks;
  return rest;
};

export const execute = (marks: Marks, cmd: AttendanceCommand): Marks => {
  switch (cmd.kind) {
    case 'mark': return { ...marks, [cmd.studentId]: cmd.to };
    case 'markAll': return { ...marks, ...Object.fromEntries(cmd.studentIds.map((id) => [id, cmd.to])) };
  }
};

export const undo = (marks: Marks, cmd: AttendanceCommand): Marks => {
  switch (cmd.kind) {
    case 'mark': return cmd.from === undefined ? without(marks, cmd.studentId) : { ...marks, [cmd.studentId]: cmd.from };
    case 'markAll': return cmd.previous;
  }
};

export const describe = (cmd: AttendanceCommand): string =>
  cmd.kind === 'mark' ? `Marked one student ${cmd.to}` : `Marked everyone ${cmd.to}`;

// Undo/redo history, also pure.
export interface History { past: AttendanceCommand[]; future: AttendanceCommand[] }
export const emptyHistory: History = { past: [], future: [] };
const LIMIT = 100;

export const record = (h: History, cmd: AttendanceCommand): History =>
  ({ past: [...h.past, cmd].slice(-LIMIT), future: [] });

export const stepBack = (h: History): { history: History; cmd?: AttendanceCommand } => {
  const cmd = h.past.at(-1);
  return cmd ? { cmd, history: { past: h.past.slice(0, -1), future: [cmd, ...h.future] } } : { history: h };
};

export const stepForward = (h: History): { history: History; cmd?: AttendanceCommand } => {
  const [cmd, ...rest] = h.future;
  return cmd ? { cmd, history: { past: [...h.past, cmd], future: rest } } : { history: h };
};
