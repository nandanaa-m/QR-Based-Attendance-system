/**
 * Storage Abstraction Layer
 * 
 * This module provides a unified interface for data storage.
 * Phase 1: Uses Google Sheets
 * Phase 2: Will switch to MongoDB (just change the import)
 * 
 * The abstraction ensures the rest of the app doesn't need to change
 * when switching storage backends.
 */

import GoogleSheetsStorage from './googleSheetsStorage.js';
// Phase 2: import MongoStorage from './mongoStorage.js';

// Export the storage implementation
// Phase 2: Change this to MongoStorage
const storage = new GoogleSheetsStorage();

export default storage;

/**
 * Storage Interface (for reference)
 * Any storage implementation should have these methods:
 * 
 * Sessions:
 * - createSession(sessionData) -> session
 * - getSession(sessionId) -> session
 * - updateSession(sessionId, data) -> session
 * - getAllSessions() -> sessions[]
 * 
 * Attendance:
 * - markAttendance(attendanceData) -> record
 * - getAttendanceBySession(sessionId) -> records[]
 * - checkDuplicateAttendance(sessionId, studentId) -> boolean
 * - getAttendanceRecord(recordId) -> record
 */

