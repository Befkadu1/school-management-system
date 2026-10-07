import { createSlice, createEntityAdapter, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { NewStudent, Student } from '../api/types';
import type { ThunkExtra } from './extra';

// Entity adapter = normalized state ({ ids, entities }) with ready-made reducers and selectors.
const adapter = createEntityAdapter<Student>();

export interface StudentsState extends ReturnType<typeof adapter.getInitialState> {
  search: string; classId: number | null; total: number;
  status: 'idle' | 'loading' | 'ready' | 'error'; error: string | null;
}

const initialState: StudentsState = adapter.getInitialState({
  search: '', classId: null, total: 0, status: 'idle', error: null,
} as Omit<StudentsState, 'ids' | 'entities'>);

export const createStudent = createAsyncThunk<Student, NewStudent, { extra: ThunkExtra; rejectValue: string }>(
  'students/create',
  async (input, { extra, rejectWithValue }) => {
    try { return await extra.api.createStudent(input); } catch (e) { return rejectWithValue((e as Error).message); }
  },
);

const slice = createSlice({
  name: 'students',
  initialState,
  reducers: {
    searchChanged: (s, a: PayloadAction<string>) => { s.search = a.payload; },
    classFilterChanged: (s, a: PayloadAction<number | null>) => { s.classId = a.payload; },
    loadRequested: (s) => { s.status = 'loading'; s.error = null; },
    loaded: (s, a: PayloadAction<{ items: Student[]; total: number }>) => {
      adapter.setAll(s, a.payload.items); s.total = a.payload.total; s.status = 'ready';
    },
    loadFailed: (s, a: PayloadAction<string>) => { s.status = 'error'; s.error = a.payload; },
  },
  extraReducers: (b) => {
    b.addCase(createStudent.fulfilled, (s, a) => { adapter.addOne(s, a.payload); s.total += 1; });
  },
});

export const studentsActions = slice.actions;
export const studentsReducer = slice.reducer;
export const studentSelectors = adapter.getSelectors((s: { students: StudentsState }) => s.students);
