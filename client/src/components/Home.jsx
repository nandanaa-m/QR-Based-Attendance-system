import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { checkHealth } from '../services/api';
import './Home.css';

const Home = () => {
  const [apiStatus, setApiStatus] = useState('checking');

  useEffect(() => {
    checkApiHealth();
  }, []);

  const checkApiHealth = async () => {
    try {
      await checkHealth();
      setApiStatus('online');
    } catch {
      setApiStatus('offline');
    }
  };

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content animate-fade-in">
          <div className="hero-badge">
            <span className="badge-dot"></span>
            Phase 1.5 • Authentication
          </div>

          <h1 className="hero-title">
            QR-Based
            <span className="gradient-text"> Attendance</span>
            <br />System
          </h1>

          <p className="hero-description">
            A modern, location-aware attendance system with OTP verification.
            Faculty manage sessions, students mark attendance with institutional email validation.
          </p>

          <div className="hero-actions">
            <Link to="/login?role=teacher" className="btn-primary btn-large">
              <span>◇</span> I'm Faculty
            </Link>
            <Link to="/login?role=student" className="btn-secondary btn-large">
              <span>○</span> I'm Student
            </Link>
          </div>

          <div className="api-status">
            <span className={`status-dot ${apiStatus}`}></span>
            <span>
              API Status: {apiStatus === 'checking' ? 'Checking...' : apiStatus === 'online' ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="hero-visual animate-fade-in">
          <div className="visual-card">
            <div className="qr-placeholder">
              <div className="qr-pattern">
                <div className="qr-row">
                  <span></span><span></span><span></span><span></span><span></span>
                </div>
                <div className="qr-row">
                  <span></span><span></span><span></span><span></span><span></span>
                </div>
                <div className="qr-row">
                  <span></span><span></span><span></span><span></span><span></span>
                </div>
                <div className="qr-row">
                  <span></span><span></span><span></span><span></span><span></span>
                </div>
                <div className="qr-row">
                  <span></span><span></span><span></span><span></span><span></span>
                </div>
              </div>
            </div>
            <p>Scan to mark attendance</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <h2>Security & Reliability</h2>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">OTP</div>
            <h3>OTP Verification</h3>
            <p>Secure login for both faculty and students using email-based one-time passwords</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📱</div>
            <h3>Device Fingerprinting</h3>
            <p>Prevents proxy attendance by locking scans to a single physical device per student</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📍</div>
            <h3>GPS Validation</h3>
            <p>Ensures students are physically present within the class radius</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">Edu</div>
            <h3>MNIT Email Locked</h3>
            <p>Strict institutional email requirement for students to ensure identity</p>
          </div>
        </div>
      </section>

      {/* Quick Access */}
      <section className="quick-access">
        <div className="access-card faculty">
          <div className="access-content">
            <span className="access-icon">◇</span>
            <h3>For Faculty</h3>
            <p>Create sessions, generate QR codes, and manage attendance records</p>
            <Link to="/login?role=teacher" className="btn-secondary">
              Faculty Login →
            </Link>
          </div>
        </div>

        <div className="access-card student">
          <div className="access-content">
            <span className="access-icon">○</span>
            <h3>For Students</h3>
            <p>Scan QR codes and mark your attendance with location verification</p>
            <Link to="/login?role=student" className="btn-secondary">
              Student Login →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <p>Phase 1.5 • QR Attendance System</p>
        <p className="footer-note">Built for MNIT • Secure Attendance Solution</p>
      </footer>
    </div>
  );
};

export default Home;
