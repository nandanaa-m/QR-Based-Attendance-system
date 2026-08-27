import { useState } from 'react';
import useGeolocation from '../../hooks/useGeolocation';
import { formatCoordinates } from '../../utils/helpers';
import './LocationPrompt.css';

const LocationPrompt = ({ onLocationReceived }) => {
  const { location, error, loading, getCurrentPosition } = useGeolocation();
  const [attempted, setAttempted] = useState(false);

  const handleGetLocation = async () => {
    setAttempted(true);
    try {
      const coords = await getCurrentPosition();
      if (onLocationReceived) {
        onLocationReceived(coords);
      }
    } catch (err) {
      console.error('Location error:', err);
    }
  };

  return (
    <div className="location-prompt">
      <div className="location-icon">
        {loading ? (
          <div className="location-loading">⟳</div>
        ) : location ? (
          <span className="location-success">✓</span>
        ) : (
          <span>◎</span>
        )}
      </div>

      <div className="location-content">
        <h4>Location Access</h4>
        
        {!attempted && (
          <p>We need your location to verify attendance</p>
        )}

        {loading && (
          <p className="text-muted">Getting your location...</p>
        )}

        {error && (
          <p className="text-danger">{error}</p>
        )}

        {location && (
          <div className="location-details">
            <p className="text-success">Location captured!</p>
            <p className="location-coords">
              {formatCoordinates(location.latitude, location.longitude)}
            </p>
            <p className="location-accuracy">
              Accuracy: ±{Math.round(location.accuracy)}m
            </p>
          </div>
        )}
      </div>

      {!location && (
        <button
          className="btn-primary"
          onClick={handleGetLocation}
          disabled={loading}
        >
          {loading ? 'Getting Location...' : 'Enable Location'}
        </button>
      )}

      {location && !loading && (
        <button
          className="btn-secondary"
          onClick={handleGetLocation}
        >
          Refresh
        </button>
      )}
    </div>
  );
};

export default LocationPrompt;

