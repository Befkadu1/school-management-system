import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { studentsActions, studentSelectors } from '../../store/studentsSlice';
import { fetchClasses, selectClasses } from '../../store/schoolSlice';
import { VirtualList } from '../../components/VirtualList';
import { createField, type FieldSpec } from '../../components/fieldFactory';
import { useCommand, useCommandBus, useViewFactory } from '../../core/PlatformProvider';
import { CreateStudentCommand, FilterStudentsByClassCommand, SearchStudentsCommand } from './students.command';
import { ListRow } from '../../core/views/ListRow';
import { classLabel } from '../../lib/fp';
import type { ListItem } from '../../core/views/types';
import type { NewStudent, Student } from '../../api/types';

const COLUMNS = '2fr 1fr 1.4fr 1.2fr';

export default function StudentsPage() {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.students.status);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    void dispatch(fetchClasses());
    if (status === 'idle') dispatch(studentsActions.loadRequested());
  }, [dispatch, status]);

  return (
    <>
      <h2>Students</h2>
      <p className="lede">Everyone enrolled this year. Search by any part of a name.</p>
      <Filters adding={adding} onToggleAdding={() => setAdding((isAdding) => !isAdding)} />
      {adding && <AddStudentForm onSaved={() => setAdding(false)} />}
      <ListStatus />
      <StudentList />
    </>
  );
}

const Filters = ({ adding, onToggleAdding }: { adding: boolean; onToggleAdding: () => void }) => {
  const run = useCommand();
  const classes = useAppSelector(selectClasses);
  const { search, classId } = useAppSelector((s) => s.students);

  return (
    <div className="toolbar">
      <label className="field">
        Search
        <input
          type="search"
          value={search}
          placeholder="e.g. Hana Tesfaye"
          onChange={(e) => run(new SearchStudentsCommand(e.target.value))}
        />
      </label>
      <label className="field">
        Class
        <select
          value={classId ?? ''}
          onChange={(e) => run(new FilterStudentsByClassCommand(e.target.value ? Number(e.target.value) : null))}
        >
          <option value="">All classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{classLabel(c)}</option>)}
        </select>
      </label>
      <button className="btn" onClick={onToggleAdding}>{adding ? 'Cancel' : 'Add student'}</button>
    </div>
  );
};

const AddStudentForm = ({ onSaved }: { onSaved: () => void }) => {
  const commandBus = useCommandBus();
  const fields = useStudentFields();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  // await the command when its outcome decides what the UI does next
  const save = async () => {
    const student = { ...form, gender: form.gender as 'F' | 'M', classId: Number(form.classId) };
    try {
      await commandBus.handle(new CreateStudentCommand(student));
      setForm(emptyForm);
      setError(null);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const change = (name: FormKey, value: string) => setForm((previous) => ({ ...previous, [name]: value }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); void save(); }} aria-label="Add student">
      <div className="form-grid">{fields.map((field) => createField(field, form[field.name], change))}</div>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn primary" type="submit">Save student</button>
    </form>
  );
};

const ListStatus = () => {
  const { total, status, error } = useAppSelector((s) => s.students);

  return (
    <>
      <p className="muted" aria-live="polite">{status === 'loading' ? 'Searching…' : `${total} students`}</p>
      {error && <p className="error" role="alert">{error}</p>}
    </>
  );
};

const StudentList = () => {
  const students = useAppSelector(studentSelectors.selectAll);
  const status = useAppSelector((s) => s.students.status);
  const toListItem = useViewFactory<ListItem, Student>('student-list');

  if (students.length === 0 && status === 'ready') {
    return (
      <div className="table-scroll"><div>
        <ColumnHeadings />
        <p className="empty">No students match. Try a shorter search or another class.</p>
      </div></div>
    );
  }

  return (
    <div className="table-scroll"><div>
      <ColumnHeadings />
      <VirtualList
        label="Students"
        items={students}
        rowHeight={40}
        height={520}
        getKey={(s) => s.id}
        renderRow={(s) => <ListRow item={toListItem(s)} columns={COLUMNS} />}
      />
    </div></div>
  );
};

const ColumnHeadings = () => (
  <div className="ruled-row ruled-head" style={{ gridTemplateColumns: COLUMNS }}>
    <span>Name</span><span>Class</span><span>Guardian</span><span>Phone</span>
  </div>
);

type FormKey = keyof NewStudent;

const emptyForm: Record<FormKey, string> = {
  firstName: '', fatherName: '', grandfatherName: '', gender: '', classId: '', guardianName: '', guardianPhone: '',
};

/** The form as data; the field factory decides which input each one becomes. */
const useStudentFields = (): FieldSpec<FormKey>[] => {
  const classes = useAppSelector(selectClasses);

  return [
    { name: 'firstName', label: 'Given name', kind: 'text', required: true },
    { name: 'fatherName', label: "Father's name", kind: 'text', required: true },
    { name: 'grandfatherName', label: "Grandfather's name", kind: 'text', required: true },
    { name: 'gender', label: 'Gender', kind: 'select', required: true, options: [{ value: 'F', label: 'Female' }, { value: 'M', label: 'Male' }] },
    { name: 'classId', label: 'Class', kind: 'select', required: true, options: classes.map((c) => ({ value: String(c.id), label: classLabel(c) })) },
    { name: 'guardianName', label: 'Guardian', kind: 'text', required: true },
    { name: 'guardianPhone', label: 'Guardian phone', kind: 'tel', required: true, placeholder: '+251911234567' },
  ];
};
