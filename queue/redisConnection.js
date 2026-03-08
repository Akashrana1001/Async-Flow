/**
 * redisConnection.js - Shared Redis Connection Configuration
 * 
 * BullMQ requires a Redis connection to store and manage jobs.
 * This file exports the connection config that is shared across
 * the queue (producer) and worker (consumer) sides.
 * 
 * Why a separate file?
 *   Both the API server and the worker process need to connect to
 *   the same Redis instance. By keeping the config in one place,
 *   we avoid duplication and make it easy to change.
 */

require('dotenv').config();

/**
 * Redis connection configuration object.
 * 
 * BullMQ accepts this as the `connection` option when creating
 * a Queue or Worker instance.
 * 
 * Reads from environment variables with sensible defaults:
 *   - REDIS_HOST → defaults to 'localhost'
 *   - REDIS_PORT → defaults to 6379
 */
const redisConnection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,

    // maxRetriesPerRequest: null is required by BullMQ
    // to avoid timeout errors on long-running jobs
    maxRetriesPerRequest: null,
};

module.exports = redisConnection;
