import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../../services/api';
import './Header.css';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const teacherNav = [
    { path: '/faculty', label: 'Create Session', icon: '◈' },
    { path: '/dashboard', label: 'My Sessions', icon: '▣' },
  ];

  const studentNav = [
    { path: '/student', label: 'Mark Attendance', icon: '○' },
  ];

  const publicNav = [
    { path: '/', label: 'Home', icon: '◈' },
  ];

  const getNavItems = () => {
    if (!user) return publicNav;
    return user.role === 'teacher' ? teacherNav : studentNav;
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <span className="logo-icon">⬡</span>
          <span className="logo-text">QR Attendance</span>
        </Link>

        <nav className="nav">
          {getNavItems().map(({ path, label, icon }) => (
            <Link
              key={path}
              to={path}
              className={`nav-link ${location.pathname === path ? 'active' : ''}`}
            >
              <span className="nav-icon">{icon}</span>
              <span className="nav-label">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          {user ? (
            <div className="user-info">
              <span className="user-email">{user.email.split('@')[0]}</span>
              <button onClick={handleLogout} className="btn-logout">Logout</button>
            </div>
          ) : (
            <Link to="/login" className="btn-login">Login</Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
