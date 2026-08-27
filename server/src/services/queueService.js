import storage from '../storage/index.js';

/**
 * Attendance Batch-Write Queue Service
 *
 * Problem solved:
 *   Google Sheets API allows ~60 write requests / minute.
 *   When 120+ students scan simultaneously, synchronous writes
 *   immediately exceed that limit and start returning 429 errors.
 *
 * Solution:
 *   - Every incoming attendance write is pushed onto an in-memory queue.
 *   - A setInterval timer fires every FLUSH_INTERVAL_MS milliseconds.
 *   - Each tick pops up to FLUSH_CHUNK_SIZE items and writes them to storage.
 *   - Flush rate = FLUSH_CHUNK_SIZE * (60_000 / FLUSH_INTERVAL_MS) writes/min
 *     Default: 10 items × 6 ticks/min = 60 writes/min  ✓
 *
 * Each call to enqueue() returns a Promise that resolves with the saved
 * record or rejects if storage.markAttendance() throws, so callers can
 * await it when needed (e.g. tests).  The HTTP controller does NOT await
 * it — it sends 202 immediately and lets the queue handle the write.
 */

const FLUSH_INTERVAL_MS = 10_000; // flush every 10 seconds
const FLUSH_CHUNK_SIZE  = 10;      // max 10 writes per flush → 60/min

class QueueService {
  constructor() {
    /** @type {Array<{data: object, resolve: Function, reject: Function}>} */
    this._queue   = [];
    this._timer   = null;

    // Telemetry counters (visible in /api/health)
    this._stats = {
      totalEnqueued:  0,
      totalFlushed:   0,
      totalFailed:    0,
      currentLength:  0,
      lastFlushAt:    null,
      flushRatePerMin: `${FLUSH_CHUNK_SIZE * (60_000 / FLUSH_INTERVAL_MS)}/min`,
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────

  /**
   * Start the background flush timer.
   * Must be called once at server boot (app.js).
   */
  start() {
    if (this._timer) return; // already running
    this._timer = setInterval(() => this._flush(), FLUSH_INTERVAL_MS);
    // Allow Node to exit even if timer is pending
    if (this._timer.unref) this._timer.unref();
    console.log(
      `✅ QueueService started — flushing ${FLUSH_CHUNK_SIZE} records every ${FLUSH_INTERVAL_MS / 1000}s (≤${this._stats.flushRatePerMin} writes)`
    );
  }

  /**
   * Stop the timer (useful in tests).
   */
  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  /**
   * Add an attendance record to the queue.
   *
   * @param {object} attendanceData — validated record ready for storage
   * @returns {{ promise: Promise, position: number, estimatedWaitMs: number }}
   *   `promise` resolves with the saved record or rejects on storage error.
   *   Callers that send 202 should NOT await the promise.
   */
  enqueue(attendanceData) {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject  = rej;
    });

    this._queue.push({ data: attendanceData, resolve, reject });

    this._stats.totalEnqueued++;
    this._stats.currentLength = this._queue.length;

    // Position in queue (1-indexed) and rough wait estimate
    const position       = this._queue.length;
    const chunksAhead    = Math.ceil(position / FLUSH_CHUNK_SIZE);
    const estimatedWaitMs = chunksAhead * FLUSH_INTERVAL_MS;

    return { promise, position, estimatedWaitMs };
  }

  /**
   * Current queue statistics — surfaced via /api/health.
   */
  getStats() {
    return { ...this._stats };
  }

  // ─────────────────────────────────────────────────────────────────
  // Internal flush logic
  // ─────────────────────────────────────────────────────────────────

  async _flush() {
    if (this._queue.length === 0) return;

    // Take at most FLUSH_CHUNK_SIZE items from the front of the queue
    const chunk = this._queue.splice(0, FLUSH_CHUNK_SIZE);
    this._stats.currentLength = this._queue.length;
    this._stats.lastFlushAt   = new Date().toISOString();

    console.log(`🔄 QueueService: flushing ${chunk.length} attendance record(s)…`);

    // Write each record sequentially to stay within rate limits.
    // Parallel writes would defeat the purpose of batching.
    for (const item of chunk) {
      try {
        const saved = await storage.markAttendance(item.data);
        this._stats.totalFlushed++;
        item.resolve(saved);
      } catch (err) {
        this._stats.totalFailed++;
        console.error('QueueService flush error for record', item.data.recordId, err.message);
        item.reject(err);
      }
    }

    console.log(
      `✅ QueueService flush done — flushed: ${this._stats.totalFlushed}, failed: ${this._stats.totalFailed}, remaining: ${this._stats.currentLength}`
    );
  }
}

// Export a single shared instance (singleton)
export default new QueueService();
