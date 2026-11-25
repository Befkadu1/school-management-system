import { lazy, useEffect, useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { withSuspense } from './components/with-suspense';
import { schoolApi } from './api/school-api';

// Code splitting: each page is its own JS chunk, loaded on first visit.
const Dashboard = withSuspense(lazy(() => import('./features/dashboard/dashboard-page')));
const Students = withSuspense(lazy(() => import('./features/students/students-page')));
const Attendance = withSuspense(lazy(() => import('./features/attendance/attendance-page')));
const Fees = withSuspense(lazy(() => import('./features/fees/fees-page')));
const Assistant = withSuspense(lazy(() => import('./features/assistant/assistant-page')));

export default function App() {
  const [model, setModel] = useState<string | null>(null);
  useEffect(() => {
    schoolApi.health().then((h) => setModel(h.model)).catch(() => setModel(null));
  }, []);

  return (
    <div className="shell">
      <aside className="cover">
        <div>
          <h1>Bole Hope Academy</h1>
          <p>School office, 2026/27</p>
        </div>
        <nav className="nav" aria-label="Main">
          <NavLink to="/" end>Today</NavLink>
          <NavLink to="/attendance">Attendance</NavLink>
          <NavLink to="/students">Students</NavLink>
          <NavLink to="/fees">Fees</NavLink>
          <NavLink to="/assistant">Assistant</NavLink>
        </nav>
        {model && <span className="model">Assistant: {model}</span>}
      </aside>
      <main className="sheet">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/students" element={<Students />} />
          <Route path="/fees" element={<Fees />} />
          <Route path="/assistant" element={<Assistant />} />
        </Routes>
      </main>
    </div>
  );
}
