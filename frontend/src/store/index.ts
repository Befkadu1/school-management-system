import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import { studentsReducer } from './studentsSlice';
import { attendanceReducer } from './attendanceSlice';
import { schoolReducer } from './schoolSlice';
import { feesReducer } from './feesSlice';
import { assistantReducer } from './assistantSlice';
import { createEffects } from './effects';
import { schoolApi, type SchoolApi } from '../api/schoolApi';

const rootReducer = combineReducers({
  students: studentsReducer,
  attendance: attendanceReducer,
  school: schoolReducer,
  fees: feesReducer,
  assistant: assistantReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

/** Store factory: the real app uses the real API, tests pass a fake one. */
export const makeStore = (api: SchoolApi = schoolApi, options?: { searchDebounceMs?: number }) => {
  const extra = { api };
  const effects = createEffects(extra, options);
  return configureStore({
    reducer: rootReducer,
    middleware: (gdm) => gdm({ thunk: { extraArgument: extra } }).prepend(effects.middleware),
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
