import { Command } from '../../core/commandBus';
import type { NewStudent } from '../../api/types';

export class CreateStudentCommand extends Command {
  readonly name = 'CreateStudent';
  constructor(public readonly student: NewStudent) { super(); }
}

export class SearchStudentsCommand extends Command {
  readonly name = 'SearchStudents';
  constructor(public readonly search: string) { super(); }
}

export class FilterStudentsByClassCommand extends Command {
  readonly name = 'FilterStudentsByClass';
  constructor(public readonly classId: number | null) { super(); }
}
