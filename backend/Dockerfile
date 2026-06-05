# ==========================================
# STAGE 1: Build TypeScript Application
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy dependency manifests
COPY package*.json tsconfig.json ./

# Install all dependencies (including devDependencies for compilation)
RUN npm ci

# Copy application source code
COPY src/ ./src

# Compile TypeScript to JavaScript in /dist
RUN npm run build

# ==========================================
# STAGE 2: Production Runner Image
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy dependency manifests
COPY package*.json ./

# Install ONLY production dependencies (reduces size & vulnerabilities)
RUN npm ci --only=production

# Copy compiled files from stage 1
COPY --from=builder /usr/src/app/dist ./dist

# Copy static frontend assets & migrations files
COPY public/ ./public
COPY migrations/ ./migrations

# Expose port (must match Express configuration env.PORT)
EXPOSE 5000

# Set non-root user for security compliance
USER node

# Start production server
CMD ["node", "dist/server.js"]
