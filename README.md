# Backend Task Queue

![Node.js](https://img.shields.io/badge/Node.js-18-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
![BullMQ](https://img.shields.io/badge/BullMQ-5-FF6B6B)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow)

> A **distributed background job processing system** built with Node.js, Express, BullMQ, and Redis. Decouples slow tasks (email sending, image processing) from the HTTP request cycle using a persistent Redis-backed queue with priority levels, delayed scheduling, automatic retries, and real-time progress tracking.

---

## Table of Contents

- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Running the Project](#running-the-project)
- [API Endpoints](#api-endpoints)
- [Example Requests](#example-requests)
- [Job Features](#job-features)
- [Job States](#job-states)
- [Configuration](#configuration)
- [Tech Stack](#tech-stack)

---

## How It Works

### Request Flow

| Step | What Happens |
|------|-------------|
| 1 | Client sends a `POST` request with job data (e.g., email recipient, image URL) |
| 2 | The API server validates the request and adds the job to the BullMQ queue in Redis |
| 3 | The server immediately responds with a `jobId` — the client does not wait for processing |
| 4 | The worker process (running separately) picks up the job from the queue |
| 5 | The worker executes the job, reporting progress at each stage |
| 6 | The client can poll `GET /jobs/:id` at any time to check the job's state and result |

### Why a Background Queue?

Some tasks are too slow to block an HTTP response — sending emails, processing images, generating PDFs. Without a queue, the user would wait several seconds per request and a single slow task could tie up the server.

BullMQ solves this by acting as a persistent **message broker** between the API and the worker:
- The API stays fast — it only writes a job to Redis and returns immediately
- The worker runs in a **separate process** and can be scaled independently
- Jobs survive server restarts because they are persisted in Redis
- Failed jobs are **automatically retried** with exponential backoff

---

## Architecture

```
┌──────────┐     ┌─────────────┐     ┌─────────────────────┐
│  Client  │ --> │ Express API │ --> │   Redis (BullMQ)    │
│ (curl /  │ <-- │  server.js  │     │   Queue: task-queue │
│  browser)│     └─────────────┘     └──────────┬──────────┘
└──────────┘                                    │
                                                │ listens
                                                ▼
                                      ┌─────────────────────┐
                                      │   Worker Process    │
                                      │   jobWorker.js      │
                                      │                     │
                                      │  job.name='email'   │
                                      │  --> emailJob.js    │
                                      │                     │
                                      │  job.name='image'   │
                                      │  --> imageJob.js    │
                                      └─────────────────────┘
```

Both the API server and worker connect to the **same Redis instance**. The API pushes jobs in; the worker pulls them out and processes them.

---

## Project Structure

```
backend-task-queue/
├── server.js                  # Express app entry point
├── package.json               # Dependencies and npm scripts
├── docker-compose.yml         # Redis container (single service)
│
├── queue/
│   ├── redisConnection.js     # Shared Redis connection config (host, port)
│   └── jobQueue.js            # BullMQ Queue instance + addEmailJob/addImageJob helpers
│
├── workers/
│   └── jobWorker.js           # Worker process — consumes and processes jobs
│
├── jobs/
│   ├── emailJob.js            # Email job handler (simulated, with progress reporting)
│   └── imageJob.js            # Image processing handler (simulated, with progress reporting)
│
├── routes/
│   └── jobRoutes.js           # Route definitions
│
├── controllers/
│   └── jobController.js       # Request handlers and business logic
│
└── utils/
    └── logger.js              # Colored console logger (no external dependencies)
```

---

## Prerequisites

- **Node.js 18+** — [nodejs.org](https://nodejs.org/)
- **Redis 7** — either via Docker (recommended) or installed locally
- **Docker + Docker Compose** — [docker.com](https://www.docker.com/) *(for the Redis container)*

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Redis

**Using Docker (recommended):**

```bash
docker-compose up -d
```

This starts a single Redis 7 container (`task-queue-redis`) on port `6379`.

**Or use a local Redis installation:**

```bash
redis-server
```

### 3. Configure Environment (optional)

Create a `.env` file in the project root to override defaults:

```env
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## Running the Project

The system requires **two separate processes**. Open two terminals.

### Terminal 1 — API Server

```bash
npm start
```

```
[SUCCESS] 🚀 Server running on http://localhost:3000
[INFO]    Health check: http://localhost:3000/health
[INFO]    Job routes:   http://localhost:3000/jobs
```

### Terminal 2 — Worker

```bash
npm run worker
```

```
[INFO] 📋 Task queue initialized and connected to Redis
[SUCCESS] 🚀 Worker started and listening for jobs...
```

### Development Mode (auto-restart on file changes)

```bash
npm run dev
```

---

## API Endpoints

### `POST /jobs/email` — Add an Email Job

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient email address |
| `subject` | string | Yes | Email subject line |
| `body` | string | Yes | Email body content |
| `priority` | string | No | `high`, `medium`, or `low` (default: `medium`) |
| `delay` | number | No | Milliseconds before processing starts (default: `0`) |

**Success `201`:**
```json
{
  "success": true,
  "message": "Email job added to queue",
  "data": {
    "jobId": "1",
    "type": "email",
    "priority": "high",
    "delay": 0,
    "status": "waiting"
  }
}
```

---

### `POST /jobs/image` — Add an Image Processing Job

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `imageUrl` | string | Yes | URL of the image to process |
| `priority` | string | No | `high`, `medium`, or `low` (default: `medium`) |
| `delay` | number | No | Milliseconds before processing starts (default: `0`) |

**Success `201`:**
```json
{
  "success": true,
  "message": "Image processing job added to queue",
  "data": {
    "jobId": "2",
    "type": "image",
    "priority": "medium",
    "delay": 0,
    "status": "waiting"
  }
}
```

---

### `GET /jobs/:id` — Get Job Status

Returns full details for a single job: state, progress (0–100), result, and error info.

**Completed job `200`:**
```json
{
  "success": true,
  "data": {
    "jobId": "1",
    "type": "email",
    "state": "completed",
    "progress": 100,
    "data": { "to": "user@example.com", "subject": "Welcome!", "body": "..." },
    "attempts": 1,
    "maxAttempts": 3,
    "createdAt": "2026-03-12T10:00:00.000Z",
    "result": { "status": "sent", "to": "user@example.com", "sentAt": "2026-03-12T10:00:02.000Z" },
    "completedAt": "2026-03-12T10:00:02.000Z"
  }
}
```

**Not found `404`:**
```json
{
  "success": false,
  "error": "Job with ID '99' not found"
}
```

---

### `GET /jobs` — List Recent Jobs

Returns jobs grouped by state. Optional `?limit=N` query parameter (default: `10`).

**Success `200`:**
```json
{
  "success": true,
  "data": {
    "summary": { "waiting": 2, "active": 1, "completed": 8, "failed": 1, "delayed": 0 },
    "jobs": {
      "waiting": [...],
      "active": [...],
      "completed": [...],
      "failed": [...],
      "delayed": [...]
    }
  }
}
```

---

### `GET /health` — Health Check

```json
{
  "status": "ok",
  "service": "backend-task-queue",
  "timestamp": "2026-03-12T10:00:00.000Z"
}
```

---

## Example Requests

```bash
# Add a high-priority email job
curl -X POST http://localhost:3000/jobs/email \
  -H "Content-Type: application/json" \
  -d '{"to": "user@example.com", "subject": "Welcome!", "body": "Thanks for signing up!", "priority": "high"}'

# Add an image job that starts processing after 10 seconds
curl -X POST http://localhost:3000/jobs/image \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://example.com/photo.jpg", "delay": 10000}'

# Check a job's status
curl http://localhost:3000/jobs/1

# List all recent jobs (up to 20 per state)
curl http://localhost:3000/jobs?limit=20

# Health check
curl http://localhost:3000/health
```

---

## Job Features

### Priority Queue

| Priority | Internal Value | Description |
|----------|---------------|-------------|
| `high` | 1 | Processed first |
| `medium` | 5 | Default |
| `low` | 10 | Processed last |

### Automatic Retries

Every job is configured with **3 attempts** and exponential backoff. If a job throws an error, BullMQ waits before retrying:

| Attempt | Delay Before Retry |
|---------|-------------------|
| 1st retry | ~2 seconds |
| 2nd retry | ~4 seconds |
| 3rd retry | ~8 seconds |

After all 3 retries fail, the job is moved to `failed` state. The demo handlers randomly fail ~10% of the time so you can observe retries in the worker logs.

### Delayed Scheduling

Pass `delay` (milliseconds) to postpone when a job starts. The job enters `delayed` state and automatically moves to `waiting` once the delay expires.

### Progress Tracking

Both handlers report incremental progress during execution:

- **Email job** (`emailJob.js`): `0%` → `50%` → `100%` over ~2 seconds
- **Image job** (`imageJob.js`): `0%` → `25%` → `50%` → `75%` → `100%` over ~3 seconds

Progress is visible in the `GET /jobs/:id` response and in the worker console logs.

---

## Job States

```
          ┌─────────┐
          │ delayed │  waiting for delay to expire
          └────┬────┘
               │
          ┌────▼────┐
          │ waiting │  in queue, not yet picked up by the worker
          └────┬────┘
               │
          ┌────▼────┐
          │ active  │  worker is currently processing this job
          └────┬────┘
               │
       ┌───────┴────────┐
       │                │
  ┌────▼─────┐    ┌─────▼────┐
  │completed │    │  failed  │  all retries exhausted
  └──────────┘    └──────────┘
```

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port the Express server listens on |
| `REDIS_HOST` | `localhost` | Redis hostname |
| `REDIS_PORT` | `6379` | Redis port |

The `docker-compose.yml` starts **Redis only** — the Node.js processes (`npm start`, `npm run worker`) run locally.

---

## Tech Stack

| Technology | Version | Role |
|------------|---------|------|
| Node.js | 18 | JavaScript runtime |
| Express | 4 | HTTP server and routing |
| BullMQ | 5 | Job queue and worker management |
| Redis | 7 | Persistent job store |
| ioredis | 5 | Redis client (used by BullMQ) |
| dotenv | 16 | Environment variable loading |
| uuid | 9 | Unique ID generation |
| nodemon | 3 | Dev-mode auto-restart |
| Docker Compose | — | Redis container orchestration |

---

## License

[MIT](https://opensource.org/licenses/MIT)

