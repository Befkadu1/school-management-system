import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import type { Dashboard, SchoolClass } from '../api/types';
import type { ThunkExtra } from './extra';
import { classLabel } from '../lib/fp';

export interface SchoolState {
  classes: SchoolClass[];
  dashboard: Dashboard | null;
  error: string | null;
}

const initialState: SchoolState = {
  classes: [],
  dashboard: null,
  error: null,
};

export const fetchClasses = createAsyncThunk<SchoolClass[], void, { extra: ThunkExtra }>(
  'school/classes',
  (_, { extra }) => extra.api.classes(),
  // condition: skip the request if classes are already loaded (simple client-side cache)
  { condition: (_, { getState }) => (getState() as { school: SchoolState }).school.classes.length === 0 },
);

export const fetchDashboard = createAsyncThunk<Dashboard, void, { extra: ThunkExtra }>(
  'school/dashboard',
  (_, { extra }) => extra.api.dashboard(),
);

const slice = createSlice({
  name: 'school',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchClasses.fulfilled, (state, action) => {
      state.classes = action.payload;
    });
    builder.addCase(fetchDashboard.fulfilled, (state, action) => {
      state.dashboard = action.payload;
      state.error = null;
    });
    builder.addCase(fetchDashboard.rejected, (state, action) => {
      state.error = action.error.message ?? 'Could not load the dashboard';
    });
  },
});

export const schoolReducer = slice.reducer;

export const selectClasses = (state: { school: SchoolState }) => state.school.classes;

export const selectClassNames = createSelector([selectClasses], (classes) =>
  new Map(classes.map((schoolClass) => [schoolClass.id, classLabel(schoolClass)])));
