import { Parser } from 'json2csv';

/**
 * Generate CSV from attendance data
 * @param {Array} attendanceRecords - Array of attendance records
 * @param {Object} sessionInfo - Session information
 * @returns {String} - CSV string
 */
export const generateAttendanceCSV = (attendanceRecords, sessionInfo = {}) => {
  if (!attendanceRecords || attendanceRecords.length === 0) {
    // Return CSV with headers only if no records
    return 'No,Student ID,Student Name,Marked At,Distance (m)\n';
  }

  // Define CSV fields
  const fields = [
    { label: 'No', value: (row, index) => index + 1 },
    { label: 'Student ID', value: 'studentId' },
    { label: 'Student Name', value: 'studentName' },
    { label: 'Marked At', value: (row) => formatDateTime(row.markedAt) },
    { label: 'Distance (m)', value: 'distance' }
  ];

  const parser = new Parser({ fields });
  let csv = parser.parse(attendanceRecords);

  // Add session info as header
  if (sessionInfo.subject || sessionInfo.facultyName) {
    const header = [
      `Session: ${sessionInfo.subject || 'N/A'}`,
      `Faculty: ${sessionInfo.facultyName || 'N/A'}`,
      `Date: ${formatDateTime(sessionInfo.createdAt)}`,
      `Total Students: ${attendanceRecords.length}`,
      '',
      ''
    ].join('\n');
    csv = header + '\n' + csv;
  }

  return csv;
};

/**
 * Format datetime for display
 */
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

