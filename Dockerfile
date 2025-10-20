# syntax=docker/dockerfile:1

FROM node:20-alpine AS base

WORKDIR /app/src

ENV NODE_ENV=development \
    HOST=0.0.0.0 \
    PORT=5173

COPY src/package.json src/package-lock.json* ./

RUN npm install

COPY src/ .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
