# syntax=docker/dockerfile:1.4
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-slim as base

ENV CI=true

WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@latest --activate
# Build dependencies for node modules
RUN apt-get update -qq && \
  apt-get install -y python3 pkg-config build-essential openssl

FROM base

COPY . ./
RUN pnpm i
RUN pnpm --filter=@dnd-demo/server build

EXPOSE 3000
CMD node ./server/dist/index.js
