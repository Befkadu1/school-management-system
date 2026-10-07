import { Command } from '../../core/commandBus';
import type { AttendanceStatus } from '../../api/types';

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
