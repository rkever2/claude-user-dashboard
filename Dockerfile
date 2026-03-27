FROM node:22-alpine AS builder-server

WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm install
COPY server/ ./
RUN npx tsc

FROM node:22-alpine AS builder-client

WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm install
COPY client/ ./
COPY shared/ /app/shared/
RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app
COPY --from=builder-server /app/server/dist ./server/dist
COPY --from=builder-server /app/server/node_modules ./server/node_modules
COPY --from=builder-server /app/server/package.json ./server/
COPY --from=builder-client /app/client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=3080
EXPOSE 3080

CMD ["node", "server/dist/index.js"]
