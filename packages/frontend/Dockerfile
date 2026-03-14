FROM node:20-alpine AS build
WORKDIR /app

COPY package.json yarn.lock ./
COPY packages/frontend/package.json ./packages/frontend/
COPY packages/backend/package.json ./packages/backend/

RUN yarn install --frozen-lockfile

COPY packages/frontend ./packages/frontend

RUN yarn workspace frontend build

FROM nginx:1.27-alpine
COPY --from=build /app/packages/frontend/dist /usr/share/nginx/html
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
