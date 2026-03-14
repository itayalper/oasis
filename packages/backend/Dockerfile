FROM node:20-alpine AS base
WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY package.json yarn.lock ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/

RUN yarn install --frozen-lockfile

COPY packages/backend/src ./packages/backend/src
COPY packages/backend/migrations ./packages/backend/migrations
COPY packages/backend/tsconfig.json ./packages/backend/

RUN yarn workspace backend build

EXPOSE 3001
CMD ["node", "packages/backend/dist/server.js"]
