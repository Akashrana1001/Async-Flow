/**
 * emailJob.js - Email Job Handler (Simulated)
 * 
 * This file contains the logic for processing email jobs.
 * In a real application, you would integrate with an email service
 * like SendGrid, Mailgun, or AWS SES. Here we simulate the process
 * with a timeout to mimic the delay of sending an email.
 * 
 * How it works:
 *   1. The worker picks up an email job from the queue
 *   2. This handler is called with the job data
 *   3. It simulates sending by waiting 2 seconds
 *   4. It reports progress at 0%, 50%, and 100%
 *   5. ~10% of the time it randomly fails (to demonstrate retries)
 */

const logger = require('../utils/logger');

/**
 * Process an email job.
 * 
 * @param {object} job - BullMQ job instance
 * @param {string} job.data.to - Recipient email address
 * @param {string} job.data.subject - Email subject line
 * @param {string} job.data.body - Email body content
 * @returns {Promise<object>} Result with status and delivery details
 */
async function processEmailJob(job) {
    const { to, subject, body } = job.data;

    logger.info(`📧 Processing email job #${job.id}`);
    logger.info(`   To: ${to} | Subject: ${subject}`);

    // ── Step 1: Prepare the email (simulate) ────────────────────
    await job.updateProgress(0);
    logger.info(`   [0%] Preparing email...`);

    // Wait 1 second to simulate email preparation
    await delay(1000);

    // ── Step 2: Send the email (simulate) ───────────────────────
    await job.updateProgress(50);
    logger.info(`   [50%] Sending email to ${to}...`);

    // Randomly fail ~10% of the time to demonstrate retries
    if (Math.random() < 0.1) {
        throw new Error(`Failed to send email to ${to} — SMTP connection timeout`);
    }

    // Wait another 1 second to simulate network latency
    await delay(1000);

    // ── Step 3: Email sent successfully ─────────────────────────
    await job.updateProgress(100);
    logger.success(`   [100%] ✅ Email sent successfully to ${to}`);

    // Return the result (stored in Redis, accessible via job status API)
    return {
        status: 'sent',
        to,
        subject,
        sentAt: new Date().toISOString(),
    };
}

/**
 * Helper: Wait for a specified number of milliseconds.
 * This simulates real-world processing time.
 */
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = processEmailJob;
