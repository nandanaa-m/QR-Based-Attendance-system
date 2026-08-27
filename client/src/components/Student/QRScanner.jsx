import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import useGeolocation from '../../hooks/useGeolocation';
import { markAttendance, getSession } from '../../services/api';
import Loading from '../common/Loading';
import { formatDateTime, getDeviceId } from '../../utils/helpers';

const QRScanner = () => {
  const navigate = useNavigate();
  const { sessionId: urlSessionId } = useParams();

  const [step, setStep] = useState(urlSessionId ? 'form' : 'scan'); // 'scan', 'form', 'submitting', 'success', 'error'
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    studentId: '',
    studentName: ''
  });

  const { location, loading: geoLoading, getCurrentPosition } = useGeolocation();
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  // If sessionId is in URL, fetch session details
  useEffect(() => {
    if (urlSessionId) {
      fetchSessionFromUrl();
    }
  }, [urlSessionId]);

  const fetchSessionFromUrl = async () => {
    try {
      const response = await getSession(urlSessionId);
      setScanResult({
        sessionId: urlSessionId,
        subject: response.data.subject,
        location: {
          latitude: response.data.latitude,
          longitude: response.data.longitude,
          radius: response.data.radius
        }
      });
      setStep('form');
    } catch (err) {
      setError('Invalid or expired session link');
      setStep('error');
    }
  };

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && scanning) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, [scanning]);

  const startScanner = async () => {
    setError(null);
    setScanning(true);

    try {
      html5QrCodeRef.current = new Html5Qrcode('qr-reader');

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        async (decodedText) => {
          // Debug log: show scanned text
          console.log('Scanned QR code text:', decodedText);
          // Stop scanner on successful scan, only if running
          if (html5QrCodeRef.current && scanning) {
            try {
              await html5QrCodeRef.current.stop();
            } catch (stopErr) {
              console.warn('Scanner stop error (safe to ignore if already stopped):', stopErr);
            }
          }
          setScanning(false);

          try {
            const qrData = JSON.parse(decodedText);
            console.log('Parsed QR data:', qrData);
            if (!qrData.sessionId) {
              console.error('QR data missing sessionId:', qrData);
              throw new Error('Invalid QR code');
            }
            setScanResult(qrData);
            setStep('form');
            console.log('Set scanResult and step to form');
          } catch (err) {
            console.error('Error parsing QR code:', err);
            setError('Invalid QR code format. Please scan a valid attendance QR.');
            setStep('error');
          }
        },
        () => { } // Ignore errors during scanning
      );
    } catch (err) {
      setScanning(false);
      setError('Could not access camera. Please allow camera permission.');
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && scanning) {
      await html5QrCodeRef.current.stop();
    }
    setScanning(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.studentId.trim() || !formData.studentName.trim()) {
      setError('Please fill in all fields');
      return;
    }

    // Get location if not already obtained
    let studentLocation = location;
    if (!studentLocation) {
      try {
        studentLocation = await getCurrentPosition();
      } catch (err) {
        setError('Location is required. Please enable location access.');
        return;
      }
    }

    setStep('submitting');

    try {
      await markAttendance({
        sessionId: scanResult.sessionId,
        studentId: formData.studentId,
        studentName: formData.studentName,
        latitude: studentLocation.latitude,
        longitude: studentLocation.longitude,
        deviceId: getDeviceId()
      });

      setStep('success');
    } catch (err) {
      setError(err.message);
      setStep('error');
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setError(null);
    setFormData({ studentId: '', studentName: '' });
    setStep('scan');
  };

  // Render based on current step
  return (
    <div className="student-container animate-fade-in">
      {/* Scanning Step */}
      {step === 'scan' && (
        <div className="scanner-section">
          <div className="page-header text-center">
            <h1>Scan Attendance QR</h1>
            <p>Point your camera at the QR code displayed by your instructor</p>
          </div>

          <div className="scanner-card card">
            <div
              id="qr-reader"
              ref={scannerRef}
              className="qr-reader"
            ></div>

            {!scanning ? (
              <button className="btn-primary btn-full" onClick={startScanner}>
                📷 Start Camera
              </button>
            ) : (
              <button className="btn-secondary btn-full" onClick={stopScanner}>
                Stop Camera
              </button>
            )}

            {error && (
              <div className="error-message mt-2">
                <span>⚠</span> {error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Form Step */}
      {step === 'form' && scanResult && (
        <div className="form-section">
          <div className="page-header text-center">
            <h1>Mark Your Attendance</h1>
            <p className="subject-name">{scanResult.subject}</p>
          </div>

          <form className="student-form card" onSubmit={handleSubmit}>
            {/* Location Status */}
            <div className="location-status-box">
              {geoLoading ? (
                <div className="status-loading">
                  <span className="status-icon">⟳</span>
                  <span>Getting your location...</span>
                </div>
              ) : location ? (
                <div className="status-success">
                  <span className="status-icon">✓</span>
                  <span>Location captured</span>
                </div>
              ) : (
                <div className="status-pending">
                  <span className="status-icon">◎</span>
                  <span>Location will be captured on submit</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="studentId">Student ID / Roll Number *</label>
              <input
                type="text"
                id="studentId"
                value={formData.studentId}
                onChange={(e) => setFormData(prev => ({ ...prev, studentId: e.target.value }))}
                placeholder="e.g., 21CS001"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="studentName">Your Name *</label>
              <input
                type="text"
                id="studentName"
                value={formData.studentName}
                onChange={(e) => setFormData(prev => ({ ...prev, studentName: e.target.value }))}
                placeholder="Enter your full name"
                required
              />
            </div>

            {error && (
              <div className="error-message">
                <span>⚠</span> {error}
              </div>
            )}

            <button type="submit" className="btn-primary btn-full">
              Submit Attendance
            </button>

            {!urlSessionId && (
              <button
                type="button"
                className="btn-secondary btn-full mt-2"
                onClick={resetScanner}
              >
                ← Scan Different QR
              </button>
            )}
          </form>
        </div>
      )}

      {/* Submitting Step */}
      {step === 'submitting' && (
        <div className="status-section">
          <Loading size="lg" message="Marking your attendance..." />
        </div>
      )}

      {/* Success Step */}
      {step === 'success' && (
        <div className="status-section">
          <div className="success-card card text-center">
            <div className="success-icon-large">✓</div>
            <h2>Attendance Marked!</h2>
            <p>Your attendance has been successfully recorded.</p>

            <div className="success-details">
              <p><strong>Subject:</strong> {scanResult?.subject}</p>
              <p><strong>Student:</strong> {formData.studentName}</p>
              <p><strong>ID:</strong> {formData.studentId}</p>
            </div>

            <button className="btn-primary" onClick={() => navigate('/')}>
              Done
            </button>
          </div>
        </div>
      )}

      {/* Error Step */}
      {step === 'error' && (
        <div className="status-section">
          <div className="error-card card text-center">
            <div className="error-icon-large">✕</div>
            <h2>Unable to Mark Attendance</h2>
            <p className="error-text">{error}</p>

            <button className="btn-primary" onClick={resetScanner}>
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRScanner;
