import { Command, type CommandHandler } from '../commandBus';
import { attendanceActions } from '../../store/attendanceSlice';
import { markCommand, markAllCommand } from '../../store/attendanceCommands';
import type { AttendanceStatus } from '../../api/types';
import type { AppStore } from '../../store';

export class SelectAttendanceContextCommand extends Command {
  readonly name = 'SelectAttendanceContext';
  constructor(public readonly classId: number, public readonly date: string) { super(); }
}

export class MarkAttendanceCommand extends Command {
  readonly name = 'MarkAttendance';
  constructor(public readonly studentId: number, public readonly status: AttendanceStatus) { super(); }
}

export class MarkEveryoneCommand extends Command {
  readonly name = 'MarkEveryone';
  constructor(public readonly status: AttendanceStatus) { super(); }
}

export class UndoAttendanceCommand extends Command { readonly name = 'UndoAttendance'; }
export class RedoAttendanceCommand extends Command { readonly name = 'RedoAttendance'; }
export class SaveAttendanceCommand extends Command { readonly name = 'SaveAttendance'; }

/**
 * One handler for the whole attendance sheet: the commands share the same
 * state, and the undo/redo history in store/attendanceCommands.ts is still
 * the thing that records them.
 */
export class AttendanceHandler implements CommandHandler<
  SelectAttendanceContextCommand | MarkAttendanceCommand | MarkEveryoneCommand
  | UndoAttendanceCommand | RedoAttendanceCommand | SaveAttendanceCommand
> {
  constructor(private store: AppStore) {}

  public handle(command: Command): void {
    const { dispatch, getState } = this.store;

    if (command instanceof SelectAttendanceContextCommand) {
      dispatch(attendanceActions.selectionChanged({ classId: command.classId, date: command.date }));
    } else if (command instanceof MarkAttendanceCommand) {
      // Read the marks now, so undo knows the exact previous value.
      const { marks } = getState().attendance;
      dispatch(attendanceActions.commandApplied(markCommand(marks, command.studentId, command.status)));
    } else if (command instanceof MarkEveryoneCommand) {
      const { marks, roster } = getState().attendance;
      dispatch(attendanceActions.commandApplied(markAllCommand(marks, roster.map((s) => s.id), command.status)));
    } else if (command instanceof UndoAttendanceCommand) {
      dispatch(attendanceActions.undo());
    } else if (command instanceof RedoAttendanceCommand) {
      dispatch(attendanceActions.redo());
    } else if (command instanceof SaveAttendanceCommand) {
      dispatch(attendanceActions.saveRequested());
    }
  }
}
