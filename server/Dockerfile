# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY tsconfig.json ./
COPY .node-pg-migraterc.json ./
COPY src ./src
COPY migrations ./migrations
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

# Prune devDependencies for a slimmer runtime image while keeping pg + express etc.
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy compiled output, migrations (used by the migrate compose profile), and migrate config
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/.node-pg-migraterc.json ./.node-pg-migraterc.json

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --start-period=8s --retries=3 \
    CMD wget -qO- http://127.0.0.1:4000/api/health || exit 1

CMD ["node", "dist/index.js"]
