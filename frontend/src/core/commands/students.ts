import { Command, type CommandHandler } from '../commandBus';
import { createStudent, studentsActions } from '../../store/studentsSlice';
import type { NewStudent, Student } from '../../api/types';
import type { AppStore } from '../../store';

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

/** Rejects by throwing, so the caller can `await` and catch like any other command. */
export class CreateStudentHandler implements CommandHandler<CreateStudentCommand, Student> {
  constructor(private store: AppStore) {}

  public async handle(command: CreateStudentCommand): Promise<Student> {
    const result = await this.store.dispatch(createStudent(command.student));
    if (createStudent.rejected.match(result)) throw new Error(result.payload ?? 'Student was not saved');
    return result.payload;
  }
}

export class StudentListHandler implements CommandHandler<SearchStudentsCommand | FilterStudentsByClassCommand> {
  constructor(private store: AppStore) {}

  public handle(command: Command): void {
    if (command instanceof SearchStudentsCommand) {
      this.store.dispatch(studentsActions.searchChanged(command.search));
    } else if (command instanceof FilterStudentsByClassCommand) {
      this.store.dispatch(studentsActions.classFilterChanged(command.classId));
    }
  }
}
