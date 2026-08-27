import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useGeolocation from '../../hooks/useGeolocation';
import { createSession } from '../../services/api';
import { formatCoordinates } from '../../utils/helpers';
import Loading from '../common/Loading';
import './Faculty.css';

const CreateSession = () => {
  const navigate = useNavigate();
  const { location, loading: geoLoading, error: geoError, getCurrentPosition } = useGeolocation();

  const [formData, setFormData] = useState({
    facultyName: '',
    subject: '',
    radius: 50
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGetLocation = async () => {
    try {
      await getCurrentPosition();
    } catch (err) {
      console.error('Location error:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!location) {
      setError('Please enable location first');
      return;
    }

    if (!formData.facultyName.trim() || !formData.subject.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const response = await createSession({
        ...formData,
        latitude: location.latitude,
        longitude: location.longitude
      });

      // Navigate to QR display page with session data
      navigate(`/faculty/session/${response.data.sessionId}`, {
        state: { session: response.data }
      });
    } catch (err) {
      setError(err.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="faculty-container animate-fade-in">
      <div className="page-header">
        <h1>Create Attendance Session</h1>
        <p>Generate a QR code for students to mark their attendance</p>
      </div>

      <form className="session-form card" onSubmit={handleSubmit}>
        {/* Location Section */}
        <div className="form-section">
          <h3>📍 Session Location</h3>
          <p className="section-desc">Your current location will be used to validate student attendance</p>

          <div className="location-box">
            {geoLoading ? (
              <Loading size="sm" message="Getting location..." />
            ) : location ? (
              <div className="location-success-box">
                <span className="success-icon">✓</span>
                <div>
                  <p className="location-status">Location captured</p>
                  <p className="location-value">{formatCoordinates(location.latitude, location.longitude)}</p>
                </div>
                <button type="button" className="btn-secondary" onClick={handleGetLocation}>
                  Refresh
                </button>
              </div>
            ) : (
              <div className="location-prompt-box">
                {geoError && <p className="text-danger mb-2">{geoError}</p>}
                <button type="button" className="btn-primary" onClick={handleGetLocation}>
                  Enable Location
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Session Details */}
        <div className="form-section">
          <h3>📝 Session Details</h3>

          <div className="form-group">
            <label htmlFor="facultyName">Faculty Name *</label>
            <input
              type="text"
              id="facultyName"
              name="facultyName"
              value={formData.facultyName}
              onChange={handleChange}
              placeholder="Enter your name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="subject">Subject / Class *</label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="e.g., Data Structures - Section A"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="radius">Allowed Radius (meters)</label>
            <input
              type="number"
              id="radius"
              name="radius"
              value={formData.radius}
              onChange={handleChange}
              min="10"
              max="500"
              placeholder="50"
            />
            <p className="form-hint">Students must be within this distance to mark attendance</p>
          </div>
        </div>

        {error && (
          <div className="error-message">
            <span>⚠</span> {error}
          </div>
        )}

        <button
          type="submit"
          className="btn-primary btn-full"
          disabled={loading || !location}
        >
          {loading ? 'Creating Session...' : 'Generate QR Code'}
        </button>
      </form>
    </div>
  );
};

export default CreateSession;
