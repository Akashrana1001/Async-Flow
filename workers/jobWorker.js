/**
 * jobWorker.js - Background Worker Process
 * 
 * This is a SEPARATE process from the API server.
 * It listens to the 'task-queue' in Redis and processes jobs as they arrive.
 * 
 * How to run:
 *   npm run worker
 *   (or: node workers/jobWorker.js)
 * 
 * Why a separate process?
 *   Keeping the worker separate from the API server means:
 *   - The API stays fast and responsive (no heavy processing blocking it)
 *   - You can scale workers independently (run 2, 3, or 10 workers!)
 *   - If a worker crashes, the API server keeps running
 * 
 * How it works:
 *   1. The worker connects to Redis and listens for new jobs
 *   2. When a job arrives, it checks the job name ('email' or 'image')
 *   3. It calls the appropriate handler function
 *   4. BullMQ automatically handles retries if the job fails
 */

const { Worker } = require('bullmq');
const redisConnection = require('../queue/redisConnection');
const processEmailJob = require('../jobs/emailJob');
const processImageJob = require('../jobs/imageJob');
const logger = require('../utils/logger');

// ─── Create the Worker ──────────────────────────────────────────────
// The worker listens to the same queue name ('task-queue') that the
// API adds jobs to. BullMQ handles all the coordination via Redis.
const worker = new Worker(
    'task-queue',

    // This function is called for EVERY job that comes in.
    // We use job.name to decide which handler to call.
    async (job) => {
        logger.info(`🔄 Worker picked up job #${job.id} (type: ${job.name})`);

        switch (job.name) {
            case 'email':
                return await processEmailJob(job);

            case 'image':
                return await processImageJob(job);

            default:
                throw new Error(`Unknown job type: ${job.name}`);
        }
    },

    // Worker options
    {
        connection: redisConnection,

        // Process one job at a time (increase for more throughput)
        concurrency: 1,
    }
);

// ─── Event Listeners ────────────────────────────────────────────────
// BullMQ emits events for every stage of a job's lifecycle.
// We log them so you can see what's happening in real-time.

// Fired when a job starts being processed
worker.on('active', (job) => {
    logger.info(`⚡ Job #${job.id} is now ACTIVE (type: ${job.name})`);
});

// Fired when a job finishes successfully
worker.on('completed', (job, result) => {
    logger.success(`✅ Job #${job.id} COMPLETED (type: ${job.name})`);
    logger.success(`   Result: ${JSON.stringify(result)}`);
});

// Fired when a job fails (after all retries are exhausted)
worker.on('failed', (job, error) => {
    logger.error(`❌ Job #${job.id} FAILED (type: ${job.name})`);
    logger.error(`   Error: ${error.message}`);
    logger.error(`   Attempts made: ${job.attemptsMade} / ${job.opts.attempts}`);
});

// Fired on every failure (including retries)
worker.on('error', (error) => {
    logger.error(`🚨 Worker error: ${error.message}`);
});

// ─── Startup Message ────────────────────────────────────────────────
logger.success('🚀 Worker started and listening for jobs...');
logger.info('   Queue: task-queue');
logger.info('   Concurrency: 1');
logger.info('   Press Ctrl+C to stop the worker\n');

// ─── Graceful Shutdown ──────────────────────────────────────────────
// When you press Ctrl+C, we close the worker cleanly so that
// any in-progress jobs finish before the process exits.
async function gracefulShutdown(signal) {
    logger.warn(`\n⚠️  Received ${signal}. Shutting down worker gracefully...`);

    // Close the worker (waits for current job to finish)
    await worker.close();

    logger.success('👋 Worker shut down cleanly. Goodbye!');
    process.exit(0);
}

// Listen for termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
