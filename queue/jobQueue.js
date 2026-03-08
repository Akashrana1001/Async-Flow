/**
 * jobQueue.js - BullMQ Queue Setup & Job Helpers
 * 
 * This file creates the main task queue and provides helper functions
 * to add different types of jobs (email, image) to the queue.
 * 
 * Key concepts:
 *   - Queue: The "inbox" where jobs are placed before processing
 *   - Job: A unit of work (e.g., send an email, process an image)
 *   - Priority: Higher priority jobs get processed first (lower number = higher priority)
 *   - Delay: Jobs can be scheduled to run after a certain time
 *   - Retries: Failed jobs are automatically retried up to 3 times
 */

const { Queue } = require('bullmq');
const redisConnection = require('./redisConnection');
const logger = require('../utils/logger');

// ─── Create the main queue ──────────────────────────────────────────
// All jobs (email, image, etc.) go into this single queue.
// The worker will look at the job name to decide how to process it.
const taskQueue = new Queue('task-queue', {
    connection: redisConnection,
});

logger.info('📋 Task queue initialized and connected to Redis');

// ─── Priority Mapping ───────────────────────────────────────────────
// BullMQ uses numbers for priority: lower number = higher priority.
// We map human-friendly strings to numbers for the API.
const PRIORITY_MAP = {
    high: 1,    // Processed first
    medium: 5,  // Processed after high
    low: 10,    // Processed last
};

/**
 * Add an email job to the queue.
 * 
 * @param {object} emailData - Email details { to, subject, body }
 * @param {object} options - Optional settings { priority, delay }
 * @returns {Promise<Job>} The created job instance
 * 
 * Example:
 *   addEmailJob(
 *     { to: 'user@example.com', subject: 'Hello', body: 'Hi there!' },
 *     { priority: 'high', delay: 5000 }
 *   );
 */
async function addEmailJob(emailData, options = {}) {
    const job = await taskQueue.add('email', emailData, {
        // Set priority (default: medium)
        priority: PRIORITY_MAP[options.priority] || PRIORITY_MAP.medium,

        // Set delay in milliseconds (default: 0 = immediate)
        delay: options.delay || 0,

        // Retry up to 3 times if the job fails
        attempts: 3,

        // Wait longer between each retry (exponential backoff)
        backoff: {
            type: 'exponential',
            delay: 2000, // First retry after 2s, then 4s, then 8s
        },
    });

    logger.info(`📧 Email job added → ID: ${job.id}, Priority: ${options.priority || 'medium'}`);
    return job;
}

/**
 * Add an image processing job to the queue.
 * 
 * @param {object} imageData - Image details { imageUrl }
 * @param {object} options - Optional settings { priority, delay }
 * @returns {Promise<Job>} The created job instance
 * 
 * Example:
 *   addImageJob(
 *     { imageUrl: 'https://example.com/photo.jpg' },
 *     { priority: 'low', delay: 10000 }
 *   );
 */
async function addImageJob(imageData, options = {}) {
    const job = await taskQueue.add('image', imageData, {
        priority: PRIORITY_MAP[options.priority] || PRIORITY_MAP.medium,
        delay: options.delay || 0,
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
    });

    logger.info(`🖼️  Image job added → ID: ${job.id}, Priority: ${options.priority || 'medium'}`);
    return job;
}

// Export everything the rest of the app needs
module.exports = {
    taskQueue,
    addEmailJob,
    addImageJob,
    PRIORITY_MAP,
};
