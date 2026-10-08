import { createSlice, createEntityAdapter, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { NewStudent, Student } from '../api/types';
import type { ThunkExtra } from './extra';

// Entity adapter = normalized state ({ ids, entities }) with ready-made reducers and selectors.
const adapter = createEntityAdapter<Student>();

export interface StudentsState extends ReturnType<typeof adapter.getInitialState> {
  search: string;
  classId: number | null;
  total: number;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
}

const initialState: StudentsState = adapter.getInitialState({
  search: '',
  classId: null,
  total: 0,
  status: 'idle',
  error: null,
} as Omit<StudentsState, 'ids' | 'entities'>);

export const createStudent = createAsyncThunk<Student, NewStudent, { extra: ThunkExtra; rejectValue: string }>(
  'students/create',
  async (input, { extra, rejectWithValue }) => {
    try {
      return await extra.api.createStudent(input);
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

const slice = createSlice({
  name: 'students',
  initialState,
  reducers: {
    searchChanged: (state, action: PayloadAction<string>) => {
      state.search = action.payload;
    },
    classFilterChanged: (state, action: PayloadAction<number | null>) => {
      state.classId = action.payload;
    },
    loadRequested: (state) => {
      state.status = 'loading';
      state.error = null;
    },
    loaded: (state, action: PayloadAction<{ items: Student[]; total: number }>) => {
      adapter.setAll(state, action.payload.items);
      state.total = action.payload.total;
      state.status = 'ready';
    },
    loadFailed: (state, action: PayloadAction<string>) => {
      state.status = 'error';
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(createStudent.fulfilled, (state, action) => {
      adapter.addOne(state, action.payload);
      state.total += 1;
    });
  },
});

export const studentsActions = slice.actions;
export const studentsReducer = slice.reducer;
export const studentSelectors = adapter.getSelectors((state: { students: StudentsState }) => state.students);
