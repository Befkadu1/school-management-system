import { Command, type CommandHandler } from '../../core/command-bus';
import { attendanceActions } from '../../store/attendance-slice';
import { markCommand, markAllCommand } from '../../store/attendance-commands';
import {
  MarkAttendanceCommand, MarkEveryoneCommand, RedoAttendanceCommand,
  SaveAttendanceCommand, SelectAttendanceContextCommand, UndoAttendanceCommand,
} from './attendance.command';
import type { AppStore } from '../../store';

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
