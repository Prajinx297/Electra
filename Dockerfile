# Stage 1: Build the Vite frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Copy package manifests and install dependencies
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
RUN npm install

# Copy frontend source and build
COPY frontend ./frontend
RUN npm run build

# Stage 2: Build the FastAPI backend
FROM python:3.12-slim
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8080
# During production, we will serve static files from the same origin, so CORS is not the primary mechanism,
# but we allow * for API endpoints if accessed directly, or specific if needed.
ENV FRONTEND_ORIGIN="*"

# Install system dependencies if any needed
RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source
COPY backend ./backend

# Copy frontend build from stage 1 to a public folder
COPY --from=frontend-builder /app/frontend/dist ./public

# Expose port and run the FastAPI app
EXPOSE 8080
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT}"]
