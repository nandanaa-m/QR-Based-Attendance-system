import express from 'express';
import { body, validationResult } from 'express-validator';
import authService from '../services/authService.js';

const router = express.Router();

// Validation rules
const emailValidation = body('email').isEmail().normalizeEmail();
const otpValidation = body('otp').isLength({ min: 6, max: 6 });

/**
 * Request OTP for login
 * POST /api/auth/send-otp
 */
router.post('/auth/send-otp', 
  [emailValidation],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, role } = req.body; // role: 'teacher' or 'student'

    // Validate student domain if role is student
    if (role === 'student' && !email.endsWith('@mnit.ac.in')) {
      return res.status(400).json({ error: 'Students must use an @mnit.ac.in email address' });
    }

    try {
      await authService.sendOTP(email, role || 'student');
      res.json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Verify OTP and login
 * POST /api/auth/verify-otp
 */
router.post('/auth/verify-otp',
  [emailValidation, otpValidation],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp } = req.body;

    try {
      const result = authService.verifyOTP(email, otp);
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  }
);

/**
 * Get current user profile (requires token)
 * GET /api/auth/profile
 */
import { authenticate } from '../middleware/authMiddleware.js';
router.get('/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

export default router;
