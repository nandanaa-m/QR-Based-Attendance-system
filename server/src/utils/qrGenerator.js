import QRCode from 'qrcode';

/**
 * Generates QR code for a session
 * QR code contains session information encoded as JSON
 */
export const generateQRCode = async (sessionData) => {
  try {
    const qrPayload = {
      sessionId: sessionData.sessionId,
      subject: sessionData.subject,
      location: {
        latitude: sessionData.latitude,
        longitude: sessionData.longitude,
        radius: sessionData.radius
      },
      createdAt: sessionData.createdAt
    };

    // Generate QR code as data URL (base64 image)
    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrPayload), {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });

    return qrCodeDataUrl;
  } catch (error) {
    console.error('QR Code generation error:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Parse QR code payload
 */
export const parseQRPayload = (qrString) => {
  try {
    return JSON.parse(qrString);
  } catch (error) {
    throw new Error('Invalid QR code format');
  }
};

