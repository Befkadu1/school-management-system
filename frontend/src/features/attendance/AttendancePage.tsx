import { memo, useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  selectCanRedo, selectCanUndo, selectCounts, selectRoster, selectUnsavedCount,
} from '../../store/attendanceSlice';
import { fetchClasses, selectClasses } from '../../store/schoolSlice';
import { useCommand } from '../../core/PlatformProvider';
import {
  MarkAttendanceCommand, MarkEveryoneCommand, RedoAttendanceCommand,
  SaveAttendanceCommand, SelectAttendanceContextCommand, UndoAttendanceCommand,
} from './attendance.command';
import { classLabel, fullName, todayIso } from '../../lib/fp';
import type { AttendanceStatus, Student } from '../../api/types';

const OPTIONS: { status: AttendanceStatus; short: string }[] = [
  { status: 'present', short: 'P' }, { status: 'late', short: 'L' }, { status: 'absent', short: 'A' },
];

export default function AttendancePage() {
  const dispatch = useAppDispatch();
  // Every user action goes out as a command; the handler registered in core/setup.ts decides what it means.
  const run = useCommand();
  const classes = useAppSelector(selectClasses);
  const { classId, date } = useAppSelector((s) => s.attendance);

  useEffect(() => { void dispatch(fetchClasses()); }, [dispatch]);

  useEffect(() => {
    const first = classes[0];
    if (classId === null && first) run(new SelectAttendanceContextCommand(first.id, date));
  }, [classes, classId, date, run]);

  useUndoRedoShortcuts();

  return (
    <>
      <h2>Attendance</h2>
      <p className="lede">Mark each student, then save. Undo with Ctrl+Z if you tap the wrong one.</p>
      <Toolbar />
      <Tally />
      <LoadError />
      <Sheet />
      <SaveButton />
    </>
  );
}

const Toolbar = () => {
  const run = useCommand();
  const classes = useAppSelector(selectClasses);
  const roster = useAppSelector(selectRoster);
  const unsaved = useAppSelector(selectUnsavedCount);
  const canUndo = useAppSelector(selectCanUndo);
  const canRedo = useAppSelector(selectCanRedo);
  const { classId, date } = useAppSelector((s) => s.attendance);

  // Switching class or date throws away unsaved marks, so ask first.
  const changeSelection = (next: { classId?: number; date?: string }) => {
    if (unsaved > 0 && !window.confirm('You have unsaved marks. Leave without saving?')) {
      return;
    }

    run(new SelectAttendanceContextCommand(next.classId ?? classId ?? 0, next.date ?? date));
  };

  return (
    <div className="toolbar">
      <label className="field">
        Class
        <select value={classId ?? ''} onChange={(e) => changeSelection({ classId: Number(e.target.value) })}>
          {classes.map((c) => <option key={c.id} value={c.id}>{classLabel(c)}, {c.homeroomTeacher}</option>)}
        </select>
      </label>
      <label className="field">
        Date
        <input
          type="date"
          value={date}
          max={todayIso()}
          onChange={(e) => e.target.value && changeSelection({ date: e.target.value })}
        />
      </label>
      <button className="btn" disabled={roster.length === 0} onClick={() => run(new MarkEveryoneCommand('present'))}>
        Mark everyone present
      </button>
      <button className="btn" disabled={!canUndo} onClick={() => run(new UndoAttendanceCommand())}>Undo</button>
      <button className="btn" disabled={!canRedo} onClick={() => run(new RedoAttendanceCommand())}>Redo</button>
    </div>
  );
};

const Tally = () => {
  const counts = useAppSelector(selectCounts);
  const unsaved = useAppSelector(selectUnsavedCount);
  const lastSavedAt = useAppSelector((s) => s.attendance.lastSavedAt);

  return (
    <div className="tally" aria-live="polite">
      <span><b>{counts.present}</b> present</span>
      <span><b>{counts.late}</b> late</span>
      <span><b>{counts.absent}</b> absent</span>
      <span><b>{counts.unmarked}</b> not marked</span>
      {unsaved > 0 && <span className="unsaved">{unsaved} unsaved</span>}
      {unsaved === 0 && lastSavedAt && <span>Saved</span>}
    </div>
  );
};

const LoadError = () => {
  const error = useAppSelector((s) => s.attendance.error);
  if (!error) {
    return null;
  }

  return <p className="error" role="alert">{error}</p>;
};

const Sheet = () => {
  const run = useCommand();
  const roster = useAppSelector(selectRoster);
  const marks = useAppSelector((s) => s.attendance.marks);
  const status = useAppSelector((s) => s.attendance.status);

  // Stable callback (useCallback) so memoized rows don't re-render on every click.
  const onMark = useCallback((id: number, to: AttendanceStatus) => run(new MarkAttendanceCommand(id, to)), [run]);

  if (status === 'loading') {
    return <p className="muted">Loading class…</p>;
  }

  return (
    <div className="ruled">
      {roster.map((student, i) => (
        <Row key={student.id} student={student} index={i} mark={marks[student.id]} onMark={onMark} />
      ))}
    </div>
  );
};

interface RowProps {
  student: Student;
  index: number;
  mark: AttendanceStatus | undefined;
  onMark: (id: number, status: AttendanceStatus) => void;
}

// memo: a row re-renders only when its own student or mark changes
const Row = memo(({ student, index, mark, onMark }: RowProps) => (
  <div className="ruled-row" style={{ gridTemplateColumns: '32px minmax(0, 1fr) auto' }}>
    <span className="muted num">{index + 1}</span>
    <span>{fullName(student)}</span>
    <span className="marks" role="group" aria-label={`Attendance for ${fullName(student)}`}>
      {OPTIONS.map((option) => (
        <button
          key={option.status}
          className="mark"
          data-status={option.status}
          aria-pressed={mark === option.status}
          aria-label={option.status}
          title={option.status}
          onClick={() => onMark(student.id, option.status)}
        >
          {option.short}
        </button>
      ))}
    </span>
  </div>
));

const SaveButton = () => {
  const run = useCommand();
  const unsaved = useAppSelector(selectUnsavedCount);
  const status = useAppSelector((s) => s.attendance.status);

  return (
    <p>
      <button
        className="btn primary"
        disabled={unsaved === 0 || status === 'saving'}
        onClick={() => run(new SaveAttendanceCommand())}
      >
        {status === 'saving' ? 'Saving…' : 'Save attendance'}
      </button>
    </p>
  );
};

/** Ctrl/Cmd+Z undoes, Shift+Ctrl/Cmd+Z redoes, anywhere on the page. */
const useUndoRedoShortcuts = () => {
  const run = useCommand();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') {
        return;
      }

      e.preventDefault();
      run(e.shiftKey ? new RedoAttendanceCommand() : new UndoAttendanceCommand());
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [run]);
};
