import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { getSession, closeSession, getAttendance, exportAttendance } from '../../services/api';
import { formatDateTime, generateSessionLink, copyToClipboard } from '../../utils/helpers';
import Loading from '../common/Loading';
import './Faculty.css';

const QRCodeDisplay = () => {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [session, setSession] = useState(location.state?.session || null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(!location.state?.session);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!session) {
      fetchSession();
    }
    fetchAttendance();

    // Poll for attendance updates every 10 seconds
    const interval = setInterval(fetchAttendance, 10000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      setLoading(true);
      const response = await getSession(sessionId, true);
      setSession(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      const response = await getAttendance(sessionId);
      setAttendance(response.data.attendance || []);
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
    }
  };

  const handleCloseSession = async () => {
    if (!window.confirm('Are you sure you want to close this session? Students will no longer be able to mark attendance.')) {
      return;
    }

    try {
      await closeSession(sessionId);
      setSession(prev => ({ ...prev, status: 'closed' }));
    } catch (err) {
      alert('Failed to close session: ' + err.message);
    }
  };

  const handleCopyLink = async () => {
    const link = generateSessionLink(sessionId);
    await copyToClipboard(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async () => {
    try {
      const response = await exportAttendance(sessionId);

      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_${sessionId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export CSV. Please try again.');
    }
  };

  const qrPayload = session ? JSON.stringify({
    sessionId: session.sessionId,
    subject: session.subject,
    location: {
      latitude: session.latitude,
      longitude: session.longitude,
      radius: session.radius
    }
  }) : '';

  if (loading) {
    return <Loading size="lg" message="Loading session..." />;
  }

  if (error) {
    return (
      <div className="faculty-container">
        <div className="error-page card">
          <h2>Session Not Found</h2>
          <p>{error}</p>
          <Link to="/faculty" className="btn-primary">Create New Session</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="faculty-container animate-fade-in">
      <div className="session-header">
        <div>
          <h1>{session.subject}</h1>
          <p>By {session.facultyName} • {formatDateTime(session.createdAt)}</p>
        </div>
        <span className={`badge ${session.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
          {session.status}
        </span>
      </div>

      <div className="session-content">
        {/* QR Code Card */}
        <div className="qr-card card">
          <h3>Scan to Mark Attendance</h3>

          <div className="qr-wrapper">
            {session.status === 'active' ? (
              <div className="qr-container">
                <QRCode
                  value={qrPayload}
                  size={280}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
            ) : (
              <div className="qr-closed">
                <span>✕</span>
                <p>Session Closed</p>
              </div>
            )}
          </div>

          <div className="qr-actions">
            <button
              className="btn-secondary"
              onClick={handleCopyLink}
            >
              {copied ? '✓ Copied!' : '🔗 Copy Link'}
            </button>

            {session.status === 'active' && (
              <button
                className="btn-danger"
                onClick={handleCloseSession}
              >
                Close Session
              </button>
            )}
          </div>

          <div className="session-info">
            <div className="info-item">
              <span className="info-label">Session ID</span>
              <span className="info-value mono">{sessionId.slice(0, 8)}...</span>
            </div>
            <div className="info-item">
              <span className="info-label">Radius</span>
              <span className="info-value">{session.radius}m</span>
            </div>
          </div>
        </div>

        {/* Attendance List */}
        <div className="attendance-card card">
          <div className="attendance-header">
            <h3>Attendance</h3>
            <span className="attendance-count">{attendance.length} students</span>
          </div>

          {attendance.length > 0 ? (
            <div className="attendance-list">
              {attendance.map((record, index) => (
                <div key={record.recordId} className="attendance-item">
                  <span className="attendance-num">{index + 1}</span>
                  <div className="attendance-details">
                    <p className="student-name">{record.studentName}</p>
                    <p className="student-id">{record.studentId}</p>
                  </div>
                  <div className="attendance-meta">
                    <span className="attendance-time">
                      {new Date(record.markedAt).toLocaleTimeString()}
                    </span>
                    <span className="attendance-distance">{record.distance}m</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-attendance">
              <span>👥</span>
              <p>No attendance yet</p>
              <p className="text-muted">Waiting for students to scan...</p>
            </div>
          )}

          {attendance.length > 0 && (
            <button
              className="btn-secondary btn-full mt-2"
              onClick={handleExport}
            >
              📥 Export CSV
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRCodeDisplay;

