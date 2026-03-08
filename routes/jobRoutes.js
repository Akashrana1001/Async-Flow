/**
 * jobRoutes.js - API Route Definitions
 * 
 * This file maps HTTP endpoints to their controller functions.
 * It acts as the "table of contents" for the API — you can quickly
 * see all available endpoints and what they do.
 * 
 * Routes:
 *   POST /jobs/email  → Add an email job to the queue
 *   POST /jobs/image  → Add an image processing job to the queue
 *   GET  /jobs/:id    → Check the status of a specific job
 *   GET  /jobs        → List all recent jobs
 */

const express = require('express');
const router = express.Router();

// Import the controller functions
const {
    addEmailJobHandler,
    addImageJobHandler,
    getJobStatus,
    listRecentJobs,
} = require('../controllers/jobController');

// ─── Define Routes ──────────────────────────────────────────────────

// Add a new email job
// Example: POST /jobs/email { "to": "user@example.com", "subject": "Hi", "body": "Hello!" }
router.post('/email', addEmailJobHandler);

// Add a new image processing job
// Example: POST /jobs/image { "imageUrl": "https://example.com/photo.jpg" }
router.post('/image', addImageJobHandler);

// Get status of a specific job by ID
// Example: GET /jobs/123
router.get('/:id', getJobStatus);

// List all recent jobs across all states
// Example: GET /jobs?limit=20
router.get('/', listRecentJobs);

module.exports = router;
