import { ServiceName, type Platform } from '../../core/platform';
import { selectClassNames } from '../../store/schoolSlice';
import { fullName } from '../../lib/fp';
import type { ViewFactory } from '../../core/viewFactoryRegistry';
import type { ListItem } from '../../core/views/types';
import type { Student } from '../../api/types';

/**
 * Builds the list row for a student. The class name is looked up from the
 * store when the row is created, so the factory can be registered at start-up,
 * before the classes have loaded.
 */
export class StudentListFactory {
  public constructor(private platform: Platform) {}

  public create: ViewFactory<ListItem, Student> = (student: Student): ListItem => {
    return {
      key: student.id,
      label: fullName(student),
      columns: [
        { text: fullName(student) },
        { text: this.getClassName(student), className: 'muted' },
        { text: student.guardianName, className: 'muted' },
        { text: student.guardianPhone, className: 'muted' },
      ],
    };
  };

  private getClassName(student: Student): string {
    return this.classNames.get(student.classId) ?? '';
  }

  private get classNames() {
    return selectClassNames(this.store.getState());
  }

  private get store() {
    return this.platform.get(ServiceName.Store);
  }
}
