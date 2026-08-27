import jwt from 'jsonwebtoken';
import { Resend } from 'resend';

// In-memory OTP store (expires after 5 mins)
const otpStore = new Map();

/**
 * Auth Service
 * Tracks OTPs and generates JWTs using Resend for transactional email
 */
class AuthService {
  constructor() {
    // Initialize Resend with API Key
    this.resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  }

  /**
   * Send OTP to email
   */
  async sendOTP(email, role) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    otpStore.set(email, { otp, expiresAt, role });

    // In development mode (no API key or local), log to console
    // if (!this.resend || process.env.NODE_ENV === 'development') {
    //   console.log(`🔑 [DEV MODE] OTP for ${email}: ${otp}`);
    //   // If we're on Render but forgot the API key, still log it so user can see it in logs
    //   if (process.env.RENDER) {
    //     console.log(`⚠️ RESEND_API_KEY missing on Render. Verification will only work by checking Render logs.`);
    //   }
    //   return true;
    // }

    try {
      const { data, error } = await this.resend.emails.send({
        from: process.env.EMAIL_FROM || 'Attendance System <onboarding@resend.dev>',
        to: email,
        subject: 'Your Attendance System OTP',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #4f46e5;">Verification Code</h2>
            <p>Your OTP for logging into the QR Attendance System is:</p>
            <h1 style="color: #4f46e5; letter-spacing: 5px; font-size: 32px;">${otp}</h1>
            <p style="color: #64748b;">This code will expire in 5 minutes.</p>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">
              If you didn't request this, please ignore this email.
            </p>
          </div>
        `,
      });

      if (error) {
        console.error('Resend API Error:', error);
        throw new Error('Failed to send email via Transactional API');
      }

      return true;
    } catch (error) {
      console.error('Email send error:', error);
      throw new Error('Failed to send OTP email');
    }
  }

  /**
   * Verify OTP and return JWT
   */
  verifyOTP(email, otp) {
    const record = otpStore.get(email);

    if (!record) {
      throw new Error('No OTP requested for this email');
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(email);
      throw new Error('OTP has expired');
    }

    if (record.otp !== otp) {
      throw new Error('Invalid OTP code');
    }

    // Success - clean up and generate token
    otpStore.delete(email);
    
    const token = jwt.sign(
      { email, role: record.role },
      process.env.JWT_SECRET || 'fallback-secret-key-123',
      { expiresIn: '7d' }
    );

    return { token, email, role: record.role };
  }
}

export default new AuthService();
