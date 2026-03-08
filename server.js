/**
 * server.js - Express API Server (Entry Point)
 * 
 * This is the main entry point for the API server.
 * It sets up Express, loads middleware, and mounts the job routes.
 * 
 * How to run:
 *   npm start
 *   (or: node server.js)
 * 
 * The server provides REST endpoints to add jobs to the queue
 * and check their status. The actual job processing happens in
 * the worker process (workers/jobWorker.js), NOT here.
 * 
 * Architecture:
 *   ┌──────────┐     ┌───────┐     ┌──────────┐
 *   │  Client  │ ──> │  API  │ ──> │  Redis   │ <── │  Worker  │
 *   │ (curl)   │ <── │Server │     │  Queue   │ ──> │ Process  │
 *   └──────────┘     └───────┘     └──────────┘     └──────────┘
 */

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const jobRoutes = require('./routes/jobRoutes');
const logger = require('./utils/logger');

// ─── Create Express App ─────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────────────────────────────

// Parse JSON request bodies (needed for POST endpoints)
app.use(express.json());

// Simple request logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});

// ─── Routes ─────────────────────────────────────────────────────────

// Health check endpoint — useful for monitoring and Docker health checks
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'backend-task-queue',
        timestamp: new Date().toISOString(),
    });
});

// Mount all job-related routes under /jobs
// This means: POST /jobs/email, POST /jobs/image, GET /jobs/:id, GET /jobs
app.use('/jobs', jobRoutes);

// ─── 404 Handler ────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: `Route ${req.method} ${req.url} not found`,
    });
});

// ─── Error Handler ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
    logger.error(`Unhandled error: ${err.message}`);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
    });
});

// ─── Start Server ───────────────────────────────────────────────────
app.listen(PORT, () => {
    logger.success(`🚀 Server running on http://localhost:${PORT}`);
    logger.info(`   Health check: http://localhost:${PORT}/health`);
    logger.info(`   Job routes:   http://localhost:${PORT}/jobs`);
    logger.info(`\n   Remember to start the worker in a separate terminal:`);
    logger.info(`   npm run worker\n`);
});
