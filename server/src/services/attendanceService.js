import { v4 as uuidv4 } from 'uuid';
import storage from '../storage/index.js';
import { validateLocation } from '../utils/locationValidator.js';
import sessionService from './sessionService.js';
import queueService from './queueService.js';

/**
 * Attendance Service
 * Handles business logic for marking and managing attendance.
 *
 * Two write paths are exposed:
 *  1. queueAttendance() — validates eagerly, then enqueues (used by the
 *     HTTP controller; returns 202 immediately to the client).
 *  2. markAttendance()  — validates and writes synchronously to storage
 *     (used internally by the queue flush loop and in tests).
 */
class AttendanceService {

  // ─────────────────────────────────────────────────────────────────
  // Validation helper (shared between both write paths)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Run all pre-write checks and build the attendance record object.
   * Throws an Error with a user-friendly message on any violation.
   *
   * @returns {{ attendanceData: object, locationResult: object }}
   */
  async _validateAndBuild({ sessionId, studentId, studentName, latitude, longitude, studentEmail, deviceId }) {
    // 1. Verify session exists and is active
    const session = await sessionService.getSession(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'active') {
      throw new Error('Session is no longer active');
    }

    // 2. Check for duplicate attendance (by Student ID OR Device ID)
    //    Done before the location check so we reject spammers cheaply.
    const isDuplicate = await storage.checkDuplicateAttendance(sessionId, studentId, deviceId);

    if (isDuplicate) {
      throw new Error('Attendance already marked for this session from this student or device');
    }

    // 3. Validate location (bounding-box pre-check → Haversine)
    const locationResult = validateLocation(
      {
        latitude: session.latitude,
        longitude: session.longitude,
        radius:    session.radius,
      },
      {
        latitude:  parseFloat(latitude),
        longitude: parseFloat(longitude),
      }
    );

    if (!locationResult.isValid) {
      throw new Error(locationResult.message);
    }

    // 4. Build the record
    const attendanceData = {
      recordId:     uuidv4(),
      sessionId,
      studentId,
      studentName,
      markedAt:     new Date().toISOString(),
      latitude:     parseFloat(latitude),
      longitude:    parseFloat(longitude),
      distance:     locationResult.distance,
      studentEmail,
      deviceId,
    };

    return { attendanceData, locationResult };
  }

  // ─────────────────────────────────────────────────────────────────
  // Path 1: Queue (HTTP 202 — non-blocking)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Validate the attendance request eagerly, then push the record onto
   * the batch-write queue.  Returns queue metadata to the controller so
   * it can respond with HTTP 202 immediately.
   *
   * The actual DB write happens when the queue flushes (every 10 s).
   *
   * @returns {{ queued: true, position, estimatedWaitMs, message, record }}
   */
  async queueAttendance(payload) {
    const { attendanceData, locationResult } = await this._validateAndBuild(payload);

    const { position, estimatedWaitMs } = queueService.enqueue(attendanceData);

    return {
      queued:           true,
      position,
      estimatedWaitMs,
      message:          locationResult.message,
      record:           attendanceData,   // client gets the full record immediately
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // Path 2: Synchronous write (used by queue flush loop & tests)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Validate + write synchronously.  The queue flush loop calls this
   * indirectly via storage.markAttendance(); this method is kept for
   * direct use in integration tests that need to assert DB state.
   */
  async markAttendance(payload) {
    const { attendanceData, locationResult } = await this._validateAndBuild(payload);

    await storage.markAttendance(attendanceData);

    return {
      success: true,
      message: locationResult.message,
      record:  attendanceData,
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // Read operations
  // ─────────────────────────────────────────────────────────────────

  /**
   * Get all attendance records for a session.
   */
  async getAttendanceBySession(sessionId) {
    const session = await sessionService.getSession(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    const attendance = await storage.getAttendanceBySession(sessionId);

    return {
      session,
      attendance,
      totalCount: attendance.length,
    };
  }

  /**
   * Get a single attendance record by its UUID.
   */
  async getAttendanceRecord(recordId) {
    return await storage.getAttendanceRecord(recordId);
  }

  /**
   * Check if a student / device has already marked attendance.
   */
  async checkDuplicate(sessionId, studentId, deviceId) {
    return await storage.checkDuplicateAttendance(sessionId, studentId, deviceId);
  }
}

export default new AttendanceService();
