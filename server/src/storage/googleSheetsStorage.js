import { google } from 'googleapis';

/**
 * Google Sheets Storage Implementation
 * 
 * Spreadsheet structure:
 * - Sheet 1: "Sessions" - stores session data
 * - Sheet 2: "Attendance" - stores attendance records
 */
class GoogleSheetsStorage {
  constructor() {
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    this.initialized = false;
  }

  /**
   * Initialize Google Sheets API connection
   */
  async init() {
    if (this.initialized) return;

    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const authClient = await auth.getClient();
      this.sheets = google.sheets({ version: 'v4', auth: authClient });
      this.initialized = true;
      console.log('✅ Google Sheets connected');
    } catch (error) {
      console.error('❌ Google Sheets connection failed:', error.message);
      // Don't throw - allow app to run with mock data for development
      this.initialized = false;
    }
  }

  /**
   * Check if Google Sheets is properly configured
   */
  isConfigured() {
    return !!(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY &&
      process.env.GOOGLE_SPREADSHEET_ID
    );
  }

  // ==================== SESSION METHODS ====================

  /**
   * Create a new session
   */
  async createSession(sessionData) {
    await this.init();

    const row = [
      sessionData.sessionId,
      sessionData.facultyName,
      sessionData.subject,
      sessionData.latitude,
      sessionData.longitude,
      sessionData.radius,
      sessionData.createdAt,
      sessionData.status || 'active',
      sessionData.facultyEmail
    ];

    if (this.sheets && this.isConfigured()) {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Sessions!A:I',
        valueInputOption: 'RAW',
        resource: { values: [row] }
      });
    } else {
      // Development mode - store in memory
      if (!this.mockSessions) this.mockSessions = [];
      this.mockSessions.push(sessionData);
      console.log('📝 [DEV MODE] Session stored in memory:', sessionData.sessionId);
    }

    return sessionData;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId) {
    await this.init();

    if (this.sheets && this.isConfigured()) {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Sessions!A:I',
      });

      const rows = response.data.values || [];
      const sessionRow = rows.find(row => row[0] === sessionId);

      if (!sessionRow) return null;

      return {
        sessionId: sessionRow[0],
        facultyName: sessionRow[1],
        subject: sessionRow[2],
        latitude: parseFloat(sessionRow[3]),
        longitude: parseFloat(sessionRow[4]),
        radius: parseInt(sessionRow[5]),
        createdAt: sessionRow[6],
        status: sessionRow[7],
        facultyEmail: sessionRow[8]
      };
    } else {
      // Development mode - get from memory
      return this.mockSessions?.find(s => s.sessionId === sessionId) || null;
    }
  }

  /**
   * Get all sessions
   */
  async getAllSessions() {
    await this.init();

    if (this.sheets && this.isConfigured()) {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Sessions!A:I',
      });

      const rows = response.data.values || [];
      // Skip header row if exists
      const dataRows = rows[0]?.[0] === 'sessionId' ? rows.slice(1) : rows;

      return dataRows.map(row => ({
        sessionId: row[0],
        facultyName: row[1],
        subject: row[2],
        latitude: parseFloat(row[3]),
        longitude: parseFloat(row[4]),
        radius: parseInt(row[5]),
        createdAt: row[6],
        status: row[7],
        facultyEmail: row[8]
      }));
    } else {
      return this.mockSessions || [];
    }
  }

  /**
   * Update session status
   */
  async updateSession(sessionId, updates) {
    await this.init();

    if (this.sheets && this.isConfigured()) {
      // Get current data to find row index
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Sessions!A:I',
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex(row => row[0] === sessionId);

      if (rowIndex === -1) return null;

      // Update status column (H = column 8)
      if (updates.status) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `Sessions!H${rowIndex + 1}`,
          valueInputOption: 'RAW',
          resource: { values: [[updates.status]] }
        });
      }

      return this.getSession(sessionId);
    } else {
      const session = this.mockSessions?.find(s => s.sessionId === sessionId);
      if (session) {
        Object.assign(session, updates);
      }
      return session;
    }
  }

  // ==================== ATTENDANCE METHODS ====================

  /**
   * Mark attendance
   */
  async markAttendance(attendanceData) {
    await this.init();

    const row = [
      attendanceData.recordId,
      attendanceData.sessionId,
      attendanceData.studentId,
      attendanceData.studentName,
      attendanceData.markedAt,
      attendanceData.latitude,
      attendanceData.longitude,
      attendanceData.distance,
      attendanceData.studentEmail,
      attendanceData.deviceId
    ];

    if (this.sheets && this.isConfigured()) {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Attendance!A:J',
        valueInputOption: 'RAW',
        resource: { values: [row] }
      });
    } else {
      // Development mode
      if (!this.mockAttendance) this.mockAttendance = [];
      this.mockAttendance.push(attendanceData);
      console.log('📝 [DEV MODE] Attendance stored in memory:', attendanceData.studentId);
    }

    return attendanceData;
  }

  /**
   * Get attendance records for a session
   */
  async getAttendanceBySession(sessionId) {
    await this.init();

    if (this.sheets && this.isConfigured()) {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Attendance!A:J',
      });

      const rows = response.data.values || [];
      const dataRows = rows[0]?.[0] === 'recordId' ? rows.slice(1) : rows;

      return dataRows
        .filter(row => row[1] === sessionId)
        .map(row => ({
          recordId: row[0],
          sessionId: row[1],
          studentId: row[2],
          studentName: row[3],
          markedAt: row[4],
          latitude: parseFloat(row[5]),
          longitude: parseFloat(row[6]),
          distance: parseInt(row[7]),
          studentEmail: row[8],
          deviceId: row[9]
        }));
    } else {
      return this.mockAttendance?.filter(a => a.sessionId === sessionId) || [];
    }
  }

  /**
   * Check if student already marked attendance for session
   */
  async checkDuplicateAttendance(sessionId, studentId, deviceId) {
    await this.init();

    if (this.sheets && this.isConfigured()) {
      const attendance = await this.getAttendanceBySession(sessionId);
      return attendance.some(a => a.studentId === studentId || a.deviceId === deviceId);
    } else {
      return this.mockAttendance?.some(
        a => a.sessionId === sessionId && (a.studentId === studentId || a.deviceId === deviceId)
      ) || false;
    }
  }

  /**
   * Get single attendance record
   */
  async getAttendanceRecord(recordId) {
    await this.init();

    if (this.sheets && this.isConfigured()) {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Attendance!A:J',
      });

      const rows = response.data.values || [];
      const record = rows.find(row => row[0] === recordId);

      if (!record) return null;

      return {
        recordId: record[0],
        sessionId: record[1],
        studentId: record[2],
        studentName: record[3],
        markedAt: record[4],
        latitude: parseFloat(record[5]),
        longitude: parseFloat(record[6]),
        distance: parseInt(record[7]),
        studentEmail: record[8],
        deviceId: record[9]
      };
    } else {
      return this.mockAttendance?.find(a => a.recordId === recordId) || null;
    }
  }
}

export default GoogleSheetsStorage;

