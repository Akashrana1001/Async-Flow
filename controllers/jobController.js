/**
 * jobController.js - Request Handlers for Job Endpoints
 * 
 * Controllers contain the business logic for each API endpoint.
 * They receive the request, validate data, interact with the queue,
 * and send back a response.
 * 
 * Each function here corresponds to one API endpoint:
 *   - addEmailJob   → POST /jobs/email
 *   - addImageJob   → POST /jobs/image
 *   - getJobStatus  → GET  /jobs/:id
 *   - listRecentJobs → GET /jobs
 */

const { addEmailJob, addImageJob, taskQueue } = require('../queue/jobQueue');
const logger = require('../utils/logger');

/**
 * POST /jobs/email
 * 
 * Add a new email job to the queue.
 * 
 * Request body:
 *   {
 *     "to": "user@example.com",      (required)
 *     "subject": "Hello",            (required)
 *     "body": "Email content here",  (required)
 *     "priority": "high",            (optional: high | medium | low)
 *     "delay": 5000                  (optional: delay in milliseconds)
 *   }
 */
async function addEmailJobHandler(req, res) {
    try {
        const { to, subject, body, priority, delay } = req.body;

        // ── Validate required fields ────────────────────────────────
        if (!to || !subject || !body) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: to, subject, body',
            });
        }

        // ── Add job to the queue ────────────────────────────────────
        const job = await addEmailJob(
            { to, subject, body },
            { priority, delay }
        );

        // ── Send response ───────────────────────────────────────────
        res.status(201).json({
            success: true,
            message: 'Email job added to queue',
            data: {
                jobId: job.id,
                type: 'email',
                priority: priority || 'medium',
                delay: delay || 0,
                status: 'waiting',
            },
        });
    } catch (error) {
        logger.error(`Failed to add email job: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Failed to add email job to queue',
        });
    }
}

/**
 * POST /jobs/image
 * 
 * Add a new image processing job to the queue.
 * 
 * Request body:
 *   {
 *     "imageUrl": "https://example.com/photo.jpg",  (required)
 *     "priority": "low",                            (optional)
 *     "delay": 10000                                (optional)
 *   }
 */
async function addImageJobHandler(req, res) {
    try {
        const { imageUrl, priority, delay } = req.body;

        // ── Validate required fields ────────────────────────────────
        if (!imageUrl) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: imageUrl',
            });
        }

        // ── Add job to the queue ────────────────────────────────────
        const job = await addImageJob(
            { imageUrl },
            { priority, delay }
        );

        // ── Send response ───────────────────────────────────────────
        res.status(201).json({
            success: true,
            message: 'Image processing job added to queue',
            data: {
                jobId: job.id,
                type: 'image',
                priority: priority || 'medium',
                delay: delay || 0,
                status: 'waiting',
            },
        });
    } catch (error) {
        logger.error(`Failed to add image job: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Failed to add image job to queue',
        });
    }
}

/**
 * GET /jobs/:id
 * 
 * Get the current status of a specific job by its ID.
 * 
 * Returns the job's state (waiting, active, completed, failed),
 * progress, result (if completed), and failure reason (if failed).
 */
async function getJobStatus(req, res) {
    try {
        const { id } = req.params;

        // ── Find the job in the queue ───────────────────────────────
        const job = await taskQueue.getJob(id);

        if (!job) {
            return res.status(404).json({
                success: false,
                error: `Job with ID '${id}' not found`,
            });
        }

        // ── Get the current state of the job ────────────────────────
        const state = await job.getState();

        // ── Build the response ──────────────────────────────────────
        const response = {
            success: true,
            data: {
                jobId: job.id,
                type: job.name,
                state: state,
                progress: job.progress,
                data: job.data,
                attempts: job.attemptsMade,
                maxAttempts: job.opts.attempts,
                createdAt: new Date(job.timestamp).toISOString(),
            },
        };

        // Add result if the job is completed
        if (state === 'completed') {
            response.data.result = job.returnvalue;
            response.data.completedAt = new Date(job.finishedOn).toISOString();
        }

        // Add error info if the job failed
        if (state === 'failed') {
            response.data.failedReason = job.failedReason;
            response.data.failedAt = new Date(job.finishedOn).toISOString();
        }

        res.json(response);
    } catch (error) {
        logger.error(`Failed to get job status: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve job status',
        });
    }
}

/**
 * GET /jobs
 * 
 * List recent jobs across all states.
 * Returns jobs grouped by their current state.
 * 
 * Query parameters:
 *   ?limit=10  (optional: max jobs per state, default 10)
 */
async function listRecentJobs(req, res) {
    try {
        const limit = parseInt(req.query.limit, 10) || 10;

        // ── Fetch jobs from all states in parallel ──────────────────
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            taskQueue.getJobs(['waiting'], 0, limit - 1),
            taskQueue.getJobs(['active'], 0, limit - 1),
            taskQueue.getJobs(['completed'], 0, limit - 1),
            taskQueue.getJobs(['failed'], 0, limit - 1),
            taskQueue.getJobs(['delayed'], 0, limit - 1),
        ]);

        /**
         * Format a job into a clean response object.
         * We don't need all the internal BullMQ data — just the essentials.
         */
        function formatJob(job, state) {
            return {
                jobId: job.id,
                type: job.name,
                state: state,
                progress: job.progress,
                data: job.data,
                attempts: job.attemptsMade,
                createdAt: new Date(job.timestamp).toISOString(),
            };
        }

        // ── Build the response ──────────────────────────────────────
        res.json({
            success: true,
            data: {
                waiting: waiting.map((j) => formatJob(j, 'waiting')),
                active: active.map((j) => formatJob(j, 'active')),
                completed: completed.map((j) => formatJob(j, 'completed')),
                failed: failed.map((j) => formatJob(j, 'failed')),
                delayed: delayed.map((j) => formatJob(j, 'delayed')),
            },
            counts: {
                waiting: waiting.length,
                active: active.length,
                completed: completed.length,
                failed: failed.length,
                delayed: delayed.length,
                total: waiting.length + active.length + completed.length + failed.length + delayed.length,
            },
        });
    } catch (error) {
        logger.error(`Failed to list jobs: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve jobs list',
        });
    }
}

module.exports = {
    addEmailJobHandler,
    addImageJobHandler,
    getJobStatus,
    listRecentJobs,
};
