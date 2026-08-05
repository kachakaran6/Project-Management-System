# Production Deployment Guide

## Prerequisites
- Node.js 18+ (or Docker Engine 24+)
- MongoDB Replica Set (Atlas or self-hosted)
- Redis instance for distributed Socket.io adapter (optional for single-node)

## Docker Setup

### Multi-stage Build
```bash
# Build images
docker build -t pms-backend:latest ./backend
docker build -t pms-client:latest ./client

# Launch container stack
docker compose up -d
```

## Coolify Orchestration
1. Link GitHub repository to your Coolify instance.
2. Select **Docker Compose** or separate **Node.js application** services.
3. Configure environment variables (`PORT`, `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGIN`).
4. Configure health check probe at `/api/health`.
