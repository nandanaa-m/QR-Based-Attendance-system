import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const location = useLocation();
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!token || !userStr) {
        // Redirect to login but save the current location
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    const user = JSON.parse(userStr);

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        // Role not authorized, redirect to home
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
