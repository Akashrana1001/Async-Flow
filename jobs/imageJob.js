/**
 * imageJob.js - Image Processing Job Handler (Simulated)
 * 
 * This file contains the logic for processing image jobs.
 * In a real application, you would use libraries like Sharp or
 * Jimp to resize, compress, or transform images. Here we simulate
 * the process with delays to mimic real processing time.
 * 
 * How it works:
 *   1. The worker picks up an image job from the queue
 *   2. This handler is called with the job data
 *   3. It simulates processing through 4 stages over ~3 seconds
 *   4. It reports progress at 0%, 25%, 50%, 75%, and 100%
 *   5. ~10% of the time it randomly fails (to demonstrate retries)
 */

const logger = require('../utils/logger');

/**
 * Process an image processing job.
 * 
 * @param {object} job - BullMQ job instance
 * @param {string} job.data.imageUrl - URL of the image to process
 * @returns {Promise<object>} Result with processing details
 */
async function processImageJob(job) {
    const { imageUrl } = job.data;

    logger.info(`🖼️  Processing image job #${job.id}`);
    logger.info(`   Image URL: ${imageUrl}`);

    // ── Stage 1: Download image (simulate) ──────────────────────
    await job.updateProgress(0);
    logger.info(`   [0%] Downloading image...`);
    await delay(800);

    // ── Stage 2: Resize image (simulate) ────────────────────────
    await job.updateProgress(25);
    logger.info(`   [25%] Resizing image...`);
    await delay(700);

    // ── Stage 3: Apply filters (simulate) ───────────────────────
    await job.updateProgress(50);
    logger.info(`   [50%] Applying filters...`);

    // Randomly fail ~10% of the time to demonstrate retries
    if (Math.random() < 0.1) {
        throw new Error(`Failed to process image — corrupted file at ${imageUrl}`);
    }

    await delay(800);

    // ── Stage 4: Compress and save (simulate) ───────────────────
    await job.updateProgress(75);
    logger.info(`   [75%] Compressing and saving...`);
    await delay(700);

    // ── Done! ───────────────────────────────────────────────────
    await job.updateProgress(100);
    logger.success(`   [100%] ✅ Image processed successfully`);

    // Return the result
    return {
        status: 'processed',
        originalUrl: imageUrl,
        processedUrl: imageUrl.replace(/(\.\w+)$/, '_processed$1'),
        dimensions: '800x600',
        processedAt: new Date().toISOString(),
    };
}

/**
 * Helper: Wait for a specified number of milliseconds.
 * This simulates real-world processing time.
 */
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = processImageJob;
