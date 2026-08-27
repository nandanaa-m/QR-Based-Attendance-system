import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/common/Header';
import Home from './components/Home';
import CreateSession from './components/Faculty/CreateSession';
import QRCodeDisplay from './components/Faculty/QRCodeDisplay';
import QRScanner from './components/Student/QRScanner';
import Dashboard from './components/Dashboard/Dashboard';
import Login from './components/common/Login';
import ProtectedRoute from './components/common/ProtectedRoute';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Header />
        <main className="main-content">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />

            {/* Faculty Routes (Protected) */}
            <Route
              path="/faculty"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <CreateSession />
                </ProtectedRoute>
              }
            />
            <Route
              path="/faculty/session/:sessionId"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <QRCodeDisplay />
                </ProtectedRoute>
              }
            />

            {/* Student Routes (Protected) */}
            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <QRScanner />
                </ProtectedRoute>
              }
            />
            <Route
              path="/scan/:sessionId"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <QRScanner />
                </ProtectedRoute>
              }
            />

            {/* Dashboard (Protected - Teachers see their sessions) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

// 404 Component
function NotFound() {
  return (
    <div className="not-found animate-fade-in">
      <h1>404</h1>
      <p>Page not found</p>
      <a href="/" className="btn-primary">Go Home</a>
    </div>
  );
}

export default App;
