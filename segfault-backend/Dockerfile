# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (including devDependencies for tsx)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Production stage (using tsx to run TypeScript directly)
FROM node:20-alpine

WORKDIR /app

# Copy everything from builder
COPY --from=builder /app ./

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL="postgresql://neondb_owner:npg_5GC3NzTORMYr@ep-restless-pine-a1vn25d9-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
ENV STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=segfaultstorage3103;AccountKey=W8uzLvLydsQtC+S343wFzVW/67oeG4ulJ0aUiAjQA4F2pP+YBABgyV8gZMgdU2T1Vssn6syDzmOY+AStzwOwMQ==;EndpointSuffix=core.windows.net"
ENV REDIS_HOSTNAME="segfaultredis.redis.cache.windows.net"
ENV REDIS_ACCESS_KEY="OUW6tF0Qz9E0evWmQIeJ8sKAjKsPYxSkTAzCaDN3iFM="
ENV VITE_API_URL = "https://segfault-backend.politeriver-a25e3b65.westeurope.azurecontainerapps.io"

EXPOSE 3000

# Use tsx to run TypeScript directly (same as dev mode)
CMD ["npx", "tsx", "src/index.ts"]
