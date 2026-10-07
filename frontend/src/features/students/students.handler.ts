import { Command, type CommandHandler } from '../../core/commandBus';
import { createStudent, studentsActions } from '../../store/studentsSlice';
import { CreateStudentCommand, FilterStudentsByClassCommand, SearchStudentsCommand } from './students.command';
import type { Student } from '../../api/types';
import type { AppStore } from '../../store';

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
