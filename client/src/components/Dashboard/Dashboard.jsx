import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllSessions, getAttendance, exportAttendance } from '../../services/api';
import { formatDateTime, formatDate } from '../../utils/helpers';
import Loading from '../common/Loading';
import './Dashboard.css';

const Dashboard = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await getAllSessions();
      setSessions(response.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionClick = async (session) => {
    setSelectedSession(session);
    setAttendanceLoading(true);

    try {
      const response = await getAttendance(session.sessionId);
      setAttendance(response.data.attendance || []);
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
      setAttendance([]);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedSession(null);
    setAttendance([]);
  };

  const handleExport = async (sessionId) => {
    try {
      // Direct API call to handle blob response properly
      const response = await exportAttendance(sessionId);

      // Create a blob URL from the response
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_${sessionId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error('Export failed:', err);
      // Fallback or error display
      alert('Failed to export CSV. Please try again.');
    }
  };

  // Calculate stats
  const totalSessions = sessions.length;
  const activeSessions = sessions.filter(s => s.status === 'active').length;
  const closedSessions = sessions.filter(s => s.status === 'closed').length;

  if (loading) {
    return <Loading size="lg" message="Loading dashboard..." />;
  }

  return (
    <div className="dashboard-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>View and manage all attendance sessions</p>
        </div>
        <Link to="/faculty" className="btn-primary">
          + New Session
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">📊</span>
          <div className="stat-content">
            <span className="stat-value">{totalSessions}</span>
            <span className="stat-label">Total Sessions</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon active">●</span>
          <div className="stat-content">
            <span className="stat-value">{activeSessions}</span>
            <span className="stat-label">Active</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon closed">●</span>
          <div className="stat-content">
            <span className="stat-value">{closedSessions}</span>
            <span className="stat-label">Closed</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span>⚠</span> {error}
        </div>
      )}

      {/* Sessions List */}
      <div className="sessions-section">
        <h2>All Sessions</h2>

        {sessions.length > 0 ? (
          <div className="sessions-list">
            {sessions.map((session) => (
              <div
                key={session.sessionId}
                className={`session-item ${selectedSession?.sessionId === session.sessionId ? 'selected' : ''}`}
                onClick={() => handleSessionClick(session)}
              >
                <div className="session-main">
                  <h3>{session.subject}</h3>
                  <p>{session.facultyName}</p>
                </div>
                <div className="session-meta">
                  <span className="session-date">{formatDate(session.createdAt)}</span>
                  <span className={`badge ${session.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                    {session.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span>📋</span>
            <h3>No sessions yet</h3>
            <p>Create your first attendance session to get started</p>
            <Link to="/faculty" className="btn-primary">
              Create Session
            </Link>
          </div>
        )}
      </div>

      {/* Session Details Modal/Panel */}
      {selectedSession && (
        <div className="session-details-overlay" onClick={closeDetails}>
          <div className="session-details-panel" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={closeDetails}>✕</button>

            <div className="details-header">
              <h2>{selectedSession.subject}</h2>
              <span className={`badge ${selectedSession.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                {selectedSession.status}
              </span>
            </div>

            <div className="details-info">
              <p><strong>Faculty:</strong> {selectedSession.facultyName}</p>
              <p><strong>Created:</strong> {formatDateTime(selectedSession.createdAt)}</p>
              <p><strong>Radius:</strong> {selectedSession.radius}m</p>
            </div>

            <div className="details-actions">
              <Link
                to={`/faculty/session/${selectedSession.sessionId}`}
                className="btn-secondary"
              >
                View QR Code
              </Link>
              <button
                className="btn-secondary"
                onClick={() => handleExport(selectedSession.sessionId)}
              >
                📥 Export CSV
              </button>
            </div>

            <div className="details-attendance">
              <h3>Attendance ({attendance.length})</h3>

              {attendanceLoading ? (
                <Loading size="sm" message="Loading..." />
              ) : attendance.length > 0 ? (
                <div className="attendance-table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>ID</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map((record, index) => (
                        <tr key={record.recordId}>
                          <td>{index + 1}</td>
                          <td>{record.studentName}</td>
                          <td>{record.studentId}</td>
                          <td>{new Date(record.markedAt).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="no-attendance">No attendance records</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div >
  );
};

export default Dashboard;

