import { lazy, useEffect, useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { withSuspense } from './components/withSuspense';

// Code splitting: each page is its own JS chunk, loaded on first visit.
const Dashboard = withSuspense(lazy(() => import('./features/dashboard/DashboardPage')));
const Students = withSuspense(lazy(() => import('./features/students/StudentsPage')));
const Attendance = withSuspense(lazy(() => import('./features/attendance/AttendancePage')));
const Fees = withSuspense(lazy(() => import('./features/fees/FeesPage')));
const Assistant = withSuspense(lazy(() => import('./features/assistant/AssistantPage')));

export default function App() {
  const [model, setModel] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/health').then((r) => r.json()).then((h: { model: string }) => setModel(h.model)).catch(() => setModel(null));
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
