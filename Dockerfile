# -----------------------
# Stage 1: Base (Common Setup)
# -----------------------
FROM node:25-alpine AS base
WORKDIR /app
COPY package*.json ./

# -----------------------
# Stage 2: Development (For local execution)
# -----------------------
FROM base AS development
RUN npm ci --loglevel=error
COPY . .

# Fix Windows line endings and set execution permissions for start script
RUN sed -i 's/\r$//' ./scripts/start.sh && chmod +x ./scripts/start.sh

EXPOSE 3000
CMD ["sh", "./scripts/start.sh"]

# -----------------------
# Stage 3: Build (Compiling TypeScript to JS)
# -----------------------
FROM base AS builder
RUN npm install --loglevel=error
COPY . .
RUN npm run build

# -----------------------
# Stage 4: Production (Final Minimal Image)
# -----------------------
FROM node:25-alpine AS production
WORKDIR /app
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev --loglevel=error
# Copy prisma files for migration and generation
COPY prisma ./prisma
COPY scripts/start.sh ./scripts/start.sh

# Fix Windows line endings and set execution permissions for start script
RUN sed -i 's/\r$//' ./scripts/start.sh && chmod +x ./scripts/start.sh


# Copy compiled JavaScript from Builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["sh", "./scripts/start.sh"]