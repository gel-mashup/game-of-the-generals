# Stage 1 — dependencies
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2 — build
FROM deps AS build
COPY src ./src
COPY tsconfig.json ./
RUN npm run build

# Stage 3 — runner
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 serverjs && \
    adduser --system --uid 1001 serverjs
COPY --from=build /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
USER serverjs
EXPOSE 3001
CMD ["node", "dist/index.js"]
