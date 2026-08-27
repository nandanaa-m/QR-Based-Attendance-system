import { getDistance } from 'geolib';

// ─────────────────────────────────────────────────────────────────────────────
// Bounding Box Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute a square bounding box around a centre point.
 *
 * Why bother?
 *   Haversine (via geolib) is accurate but involves Math.sin/cos/asin —
 *   roughly 30–50× slower than 4 plain comparisons.  For a classroom with
 *   120 students, rejecting obviously out-of-range pings with 4 comparisons
 *   (O(1), no trig) before ever calling getDistance() cuts CPU time
 *   significantly for all fraudulent/mislocated attempts.
 *
 * Approximation used:
 *   1 degree of latitude  ≈ 111,320 m   (constant everywhere)
 *   1 degree of longitude ≈ 111,320 × cos(lat) m  (shrinks toward poles)
 *
 * The box is slightly larger than the circle (worst case √2 × radius at
 * corners) which means it can pass through to Haversine a thin ring of
 * coordinates that are inside the box but outside the circle — that is
 * intentional and correct: no valid student is ever rejected early.
 *
 * @param {number} lat         — centre latitude  (degrees)
 * @param {number} lng         — centre longitude (degrees)
 * @param {number} radiusMeters — allowed radius in metres
 * @returns {{ minLat, maxLat, minLng, maxLng }}
 */
export const computeBoundingBox = (lat, lng, radiusMeters) => {
  const deltaLat = radiusMeters / 111_320;
  const deltaLng = radiusMeters / (111_320 * Math.cos((lat * Math.PI) / 180));

  return {
    minLat: lat - deltaLat,
    maxLat: lat + deltaLat,
    minLng: lng - deltaLng,
    maxLng: lng + deltaLng,
  };
};

/**
 * Fast O(1) bounding-box test — 4 numeric comparisons, zero trigonometry.
 *
 * Returns false  → student is definitely outside the allowed area; skip Haversine.
 * Returns true   → student might be inside; proceed to Haversine for precision.
 *
 * @param {{ minLat, maxLat, minLng, maxLng }} bbox
 * @param {number} studentLat
 * @param {number} studentLng
 * @returns {boolean}
 */
export const isInBoundingBox = (bbox, studentLat, studentLng) => {
  return (
    studentLat >= bbox.minLat &&
    studentLat <= bbox.maxLat &&
    studentLng >= bbox.minLng &&
    studentLng <= bbox.maxLng
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Validator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates if a student's location is within the allowed radius of the
 * session location, using a two-phase approach:
 *
 *   Phase 1 — Bounding Box (fast, O(1)):
 *     Reject coordinates that fall outside a square bounding box.
 *     No trigonometry; 4 comparisons only.
 *
 *   Phase 2 — Haversine (precise, only if phase 1 passes):
 *     Compute exact geodesic distance via geolib.
 *     Only runs for students who are plausibly near the classroom.
 *
 * @param {{ latitude, longitude, radius }} sessionLocation
 * @param {{ latitude, longitude }}         studentLocation
 * @returns {{ isValid, distance, allowedRadius, message, bboxSkipped }}
 *   `bboxSkipped` is true when the student was rejected at the bbox stage
 *   (distance will be null in that case).
 */
export const validateLocation = (sessionLocation, studentLocation) => {
  const allowedRadius =
    sessionLocation.radius ||
    parseInt(process.env.DEFAULT_RADIUS_METERS) ||
    50;

  // ── Phase 1: Bounding Box pre-check ──────────────────────────────
  const bbox = computeBoundingBox(
    sessionLocation.latitude,
    sessionLocation.longitude,
    allowedRadius
  );

  const passedBbox = isInBoundingBox(
    bbox,
    studentLocation.latitude,
    studentLocation.longitude
  );

  if (!passedBbox) {
    // Student is clearly outside the bounding box — no need to run Haversine.
    return {
      isValid:      false,
      distance:     null,   // unknown; they're beyond even the rough box
      allowedRadius,
      bboxSkipped:  true,   // tells callers Haversine was not executed
      message: `Location check failed: coordinates are outside the allowed area (bounding box pre-check). Maximum allowed radius: ${allowedRadius}m`,
    };
  }

  // ── Phase 2: Precise Haversine calculation ────────────────────────
  const distance = getDistance(
    { latitude: sessionLocation.latitude,  longitude: sessionLocation.longitude },
    { latitude: studentLocation.latitude,  longitude: studentLocation.longitude }
  );

  const isValid = distance <= allowedRadius;

  return {
    isValid,
    distance,
    allowedRadius,
    bboxSkipped: false,
    message: isValid
      ? `Location verified (${distance}m from session location)`
      : `You are ${distance}m away from the session location. Maximum allowed: ${allowedRadius}m`,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Coordinate Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format coordinates for display (6 decimal places ≈ 0.1 m precision).
 */
export const formatCoordinates = (lat, lng) => {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
};

/**
 * Validate that coordinate values are within legal ranges.
 */
export const isValidCoordinate = (lat, lng) => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90  && lat <= 90  &&
    lng >= -180 && lng <= 180
  );
};
