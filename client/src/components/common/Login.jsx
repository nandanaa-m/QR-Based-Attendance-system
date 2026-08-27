import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { sendOTP, verifyOTP } from '../../services/api';
import Loading from './Loading';
import './Login.css';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const initialRole = queryParams.get('role') || 'student';

    const [email, setEmail] = useState('');
    const [role, setRole] = useState(initialRole);
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState('email'); // 'email', 'otp'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);

    // If already logged in, redirect
    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) {
            const { role: userRole } = JSON.parse(user);
            navigate(userRole === 'teacher' ? '/faculty' : '/student');
        }
    }, [navigate]);

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError(null);
        setMessage(null);

        if (!email) {
            setError('Email is required');
            return;
        }

        if (role === 'student' && !email.endsWith('@mnit.ac.in')) {
            setError('Students must use @mnit.ac.in email');
            return;
        }

        setLoading(true);
        try {
            await sendOTP(email, role);
            setStep('otp');
            setMessage(`OTP sent to ${email}`);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setError(null);

        if (!otp || otp.length !== 6) {
            setError('Enter a valid 6-digit OTP');
            return;
        }

        setLoading(true);
        try {
            const result = await verifyOTP(email, otp);
            setMessage('Login successful!');

            // Redirect after a short delay
            setTimeout(() => {
                navigate(result.role === 'teacher' ? '/faculty' : '/student');
            }, 1000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container animate-fade-in">
            <div className="login-card card">
                <div className="login-header">
                    <h1>{role === 'teacher' ? 'Faculty Login' : 'Student Login'}</h1>
                    <p>Login with your email and OTP</p>
                </div>

                {step === 'email' ? (
                    <form onSubmit={handleSendOTP}>
                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={role === 'teacher' ? 'your-email@gmail.com' : '2024abc1234@mnit.ac.in'}
                                required
                            />
                            {role === 'student' && <p className="form-hint">Must be MNIT institutional email</p>}
                        </div>

                        <div className="role-selector">
                            <button
                                type="button"
                                className={role === 'student' ? 'active' : ''}
                                onClick={() => setRole('student')}
                            >
                                Student
                            </button>
                            <button
                                type="button"
                                className={role === 'teacher' ? 'active' : ''}
                                onClick={() => setRole('teacher')}
                            >
                                Teacher
                            </button>
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        <button type="submit" className="btn-primary btn-full" disabled={loading}>
                            {loading ? 'Sending...' : 'Send OTP'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOTP}>
                        <div className="form-group">
                            <label htmlFor="otp">Enter 6-Digit OTP</label>
                            <input
                                type="text"
                                id="otp"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="000000"
                                maxLength="6"
                                required
                            />
                            <p className="form-hint">Sent to {email}</p>
                        </div>

                        {error && <div className="error-message">{error}</div>}
                        {message && <div className="success-message">{message}</div>}

                        <button type="submit" className="btn-primary btn-full" disabled={loading}>
                            {loading ? 'Verifying...' : 'Login'}
                        </button>

                        <button
                            type="button"
                            className="btn-secondary btn-full mt-2"
                            onClick={() => setStep('email')}
                            disabled={loading}
                        >
                            Back
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Login;
