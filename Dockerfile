# ==============================================================================
# Multi-Stage Dockerfile for seeSpeak AI Platform
# Unified Full-Stack (FastAPI + Vite React SPA + Real-time WebSockets)
# ==============================================================================

# Stage 1: Build Frontend Single Page Application
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci || npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Production Python Backend + Unified Static SPA
FROM python:3.11-slim AS production
WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Install Python backend dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy Backend Source Code, Prompts, Documentation
COPY backend/ ./backend/
COPY docs/ ./docs/
COPY README.md .env.example ./

# Copy compiled frontend dist from Stage 1 into frontend/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Ensure uploads directory exists
RUN mkdir -p /app/backend/uploads

EXPOSE 8000

ENV PORT=8000
ENV ENVIRONMENT=production

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:${PORT}/api/health || exit 1

# Start Unified FastAPI Server (Serves API, WebSockets, and Frontend SPA on single port)
CMD python -m uvicorn backend.main:app --host 0.0.0.0 --port ${PORT}
