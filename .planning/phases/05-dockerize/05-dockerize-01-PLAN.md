---
phase: 05-dockerize
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - server/Dockerfile
  - docker-compose.yml
  - .env.example
autonomous: true
requirements:
  - DOCK-01
  - DOCK-02
  - DOCK-03
  - DOCK-04
user_setup: []

must_haves:
  truths:
    - "Server Dockerfile builds TypeScript and runs compiled JS in production"
    - "Server container runs as non-root user"
    - "docker-compose.yml supports health checks and restart policies"
    - "Environment variables loaded from .env file, not hardcoded"
    - "docker compose build succeeds for both services"
    - "docker compose up starts both services with correct networking"
  artifacts:
    - path: "server/Dockerfile"
      provides: "Production multi-stage server build"
      contains: "FROM node:18-alpine AS"
    - path: "docker-compose.yml"
      provides: "Production compose config"
      contains: "healthcheck"
    - path: ".env.example"
      provides: "Environment variable documentation"
      contains: "PORT"
  key_links:
    - from: "server/Dockerfile (runner stage)"
      to: "server/dist/index.js"
      via: "CMD node dist/index.js"
      pattern: "CMD.*dist/index"
    - from: "docker-compose.yml"
      to: ".env"
      via: "env_file directive"
      pattern: "env_file"
---

<objective>
Production-ready Docker setup. Server Dockerfile compiles TypeScript and runs compiled JS as non-root. docker-compose.yml gets health checks, restart policies, and env file support. .env.example documents all required variables. Both services build and start cleanly.
</objective>

<execution_context>
@~/.config/opencode/get-shit-done/workflows/execute-plan.md
@~/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@server/Dockerfile
@docker-compose.yml
@.dockerignore
@server/package.json

Current state:
- server/Dockerfile runs `npm run dev` (NOT production)
- client/Dockerfile is already production-ready (multi-stage, standalone)
- docker-compose.yml has hardcoded dev env vars, no health checks
- server/package.json has `build: tsc` and `start: node dist/index.js`
</context>

<interfaces>
<!-- Server build chain -->
```json
// server/package.json scripts
{
  "dev": "tsx watch src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js",
  "test": "jest"
}
```

<!-- Current docker-compose services -->
- client: port 3000, NEXT_PUBLIC_API_URL=http://server:3001
- server: port 3001, CORS_ORIGIN=http://localhost:3000, NODE_ENV=development
- network: gotg-network (bridge)
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Production server Dockerfile</name>
  <files>server/Dockerfile</files>
  <action>
    Replace server/Dockerfile with a production multi-stage build.

    **Stage 1 — deps:**
    - FROM node:18-alpine AS deps
    - WORKDIR /app
    - COPY package*.json ./
    - RUN npm ci

    **Stage 2 — build:**
    - FROM deps AS build
    - COPY src ./src
    - COPY tsconfig.json ./
    - RUN npm run build    # runs tsc, outputs to dist/

    **Stage 3 — runner:**
    - FROM node:18-alpine AS runner
    - WORKDIR /app
    - ENV NODE_ENV=production
    - Create non-root user: addgroup --system --gid 1001 serverjs && adduser --system --uid 1001 serverjs
    - COPY --from=build /app/dist ./dist
    - COPY --from=deps /app/node_modules ./node_modules
    - COPY package.json ./
    - USER serverjs
    - EXPOSE 3001
    - CMD ["node", "dist/index.js"]

    Keep .dockerignore as-is (already excludes node_modules, .git, etc).

    Do NOT change client/Dockerfile — it's already production-ready.
  </action>
  <verify>
    <automated>cd server && docker build -t gotg-server-test . 2>&1 | tail -5</automated>
  </verify>
  <done>Server Dockerfile has 3 stages (deps, build, runner). Runs `tsc` to compile, executes `node dist/index.js`. Non-root user (serverjs) in runner stage. Image builds successfully.</done>
</task>

<task type="auto">
  <name>Task 2: Production docker-compose with env file</name>
  <files>docker-compose.yml</files>
  <action>
    Update docker-compose.yml for production use:

    1. **Remove hardcoded environment variables** — replace with `env_file: .env` on both services
    2. **Add health checks:**
       - server: `healthcheck: test: ["CMD", "wget", "--spider", "-q", "http://localhost:3001"] || ["CMD", "nc", "-z", "localhost", "3001"]` with interval 30s, timeout 5s, retries 3
       - client: `healthcheck: test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000"] || ["CMD", "nc", "-z", "localhost", "3000"]` with same intervals
       (Use `wget --spider` first; fall back to `nc -z` since alpine may not have curl)
    3. **Add restart policies:** `restart: unless-stopped` on both services
    4. **Keep existing:** ports (3000, 3001), depends_on, networks (gotg-network)
    5. **Keep `build` directives** — services are built from local Dockerfiles, not pulled from registry

    Remove the `version: '3.8'` line (deprecated in modern Docker Compose).
  </action>
  <verify>
    <automated>docker compose config --quiet 2>&1</automated>
  </verify>
  <done>docker-compose.yml uses env_file instead of hardcoded vars. Both services have health checks and restart: unless-stopped. Compose config validates without errors.</done>
</task>

<task type="auto">
  <name>Task 3: Create .env.example and verify build</name>
  <files>.env.example</files>
  <action>
    Create .env.example in project root documenting all environment variables:

    ```
    # Server
    PORT=3001
    CORS_ORIGIN=http://localhost:3000
    NODE_ENV=production

    # Client (build-time, must be available at docker build)
    NEXT_PUBLIC_API_URL=http://server:3001
    ```

    Add comments explaining each variable. Then verify the full build:

    ```bash
    docker compose build 2>&1
    ```

    If build fails, fix the issue (likely tsconfig output path or missing files in COPY).
  </action>
  <verify>
    <automated>docker compose build 2>&1 | tail -10</automated>
  </verify>
  <done>.env.example exists with all 4 variables documented. `docker compose build` succeeds for both client and server images.</done>
</task>

</tasks>

<verification>
- docker compose build → both images built successfully
- docker compose config → validates without errors
- server/Dockerfile → 3-stage build, non-root user, CMD node dist/index.js
- .env.example → PORT, CORS_ORIGIN, NODE_ENV, NEXT_PUBLIC_API_URL documented
</verification>

<success_criteria>
- Server image runs compiled TypeScript (not tsx/dev)
- Server container runs as non-root user
- Health checks configured for both services
- Restart policies set on both services
- No hardcoded env vars in docker-compose.yml
- .env.example documents all required variables
- docker compose build produces both images
- docker compose up starts both services on gotg-network
</success_criteria>

<output>
After completion, create `.planning/phases/05-dockerize/05-dockerize-01-SUMMARY.md`
</output>
