import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchDashboard } from '../../store/school-slice';
import { formatBirr } from '../../lib/fp';

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const { dashboard, error } = useAppSelector((s) => s.school);
  useEffect(() => { void dispatch(fetchDashboard()); }, [dispatch]);

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const att = dashboard?.attendanceToday;
  return (
    <>
      <h2>{today}</h2>
      <p className="lede">What needs attention in the school today.</p>
      {error && <p className="error" role="alert">{error}</p>}
      {dashboard && att && (
        <div className="figures">
          <div className="figure"><strong>{dashboard.students}</strong><span>students in {dashboard.classes} classes</span></div>
          <div className="figure">
            <strong>{att.total === 0 ? 'Not taken' : `${Math.round(att.rate * 100)}%`}</strong>
            <span>{att.total === 0 ? 'attendance today' : `present today, ${att.absent} absent`}</span>
          </div>
          <div className="figure"><strong>{formatBirr(dashboard.outstandingSantim)}</strong><span>fees outstanding</span></div>
          <div className="figure"><strong>{dashboard.overdueInvoices}</strong><span>invoices overdue</span></div>
        </div>
      )}
      <p>
        {att?.total === 0 ? <><Link to="/attendance">Take today's attendance</Link>, or </> : null}
        <Link to="/assistant">ask the assistant</Link> who is often absent or behind on fees.
      </p>
    </>
  );
}
