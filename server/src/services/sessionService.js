import { v4 as uuidv4 } from 'uuid';
import storage from '../storage/index.js';
import { generateQRCode } from '../utils/qrGenerator.js';

/**
 * Session Service
 * Handles business logic for attendance sessions
 */
class SessionService {
  /**
   * Create a new attendance session
   */
  async createSession({ facultyName, subject, latitude, longitude, radius, facultyEmail }) {
    const sessionId = uuidv4();
    const createdAt = new Date().toISOString();
    const defaultRadius = parseInt(process.env.DEFAULT_RADIUS_METERS) || 50;

    const sessionData = {
      sessionId,
      facultyName,
      subject,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radius: parseInt(radius) || defaultRadius,
      createdAt,
      status: 'active',
      facultyEmail
    };

    // Store session in database
    await storage.createSession(sessionData);

    // Generate QR code for the session
    const qrCode = await generateQRCode(sessionData);

    return {
      ...sessionData,
      qrCode
    };
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId) {
    const session = await storage.getSession(sessionId);
    
    if (!session) {
      return null;
    }

    return session;
  }

  /**
   * Get session with QR code regenerated
   */
  async getSessionWithQR(sessionId) {
    const session = await this.getSession(sessionId);
    
    if (!session) {
      return null;
    }

    const qrCode = await generateQRCode(session);
    
    return {
      ...session,
      qrCode
    };
  }

  /**
   * Get all sessions
   */
  async getAllSessions() {
    return await storage.getAllSessions();
  }

  /**
   * Close a session
   */
  async closeSession(sessionId) {
    const session = await storage.getSession(sessionId);
    
    if (!session) {
      return null;
    }

    return await storage.updateSession(sessionId, { status: 'closed' });
  }

  /**
   * Check if session is active
   */
  async isSessionActive(sessionId) {
    const session = await storage.getSession(sessionId);
    return session?.status === 'active';
  }
}

export default new SessionService();

