import { describe, expect, it } from 'vitest';
import { StudentListFactory } from './factory';
import { createPlatform } from '../../core/setup';
import { ServiceName } from '../../core/platform';
import { makeStore } from '../../store';
import { fetchClasses } from '../../store/school-slice';
import type { SchoolApi } from '../../api/school-api';
import type { Student } from '../../api/types';

const student: Student = {
  id: 3, firstName: 'Meron', fatherName: 'Bekele', grandfatherName: 'Haile', gender: 'F',
  classId: 1, guardianName: 'Bekele Haile', guardianPhone: '+251911000000', enrolledAt: '2026-09-01',
};

const api = {
  classes: () => Promise.resolve([{ id: 1, grade: '3', section: 'A', homeroomTeacher: 'W/ro Almaz Kebede' }]),
} as unknown as SchoolApi;

const setup = () => {
  const store = makeStore(api);
  return { store, platform: createPlatform(store, api) };
};

describe('StudentListFactory', () => {
  it('builds a row from the student', () => {
    const { platform } = setup();
    const item = new StudentListFactory(platform).create(student);

    expect(item.key).toBe(3);
    expect(item.label).toBe('Meron Bekele Haile');
    expect(item.columns.map((c) => c.text)).toEqual(['Meron Bekele Haile', '', 'Bekele Haile', '+251911000000']);
  });

  it('resolves the class name once the classes have loaded', async () => {
    const { store, platform } = setup();
    await store.dispatch(fetchClasses());

    const item = new StudentListFactory(platform).create(student);
    expect(item.columns[1]?.text).toBe('Grade 3A');
  });

  it('is registered on the platform', () => {
    const { platform } = setup();

    expect(platform.get(ServiceName.ViewFactoryRegistry).has('student-list')).toBe(true);
  });
});
