FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/engine/package.json packages/engine/package.json
COPY packages/rules/package.json packages/rules/package.json
COPY packages/turn-system/package.json packages/turn-system/package.json
COPY packages/ai-core/package.json packages/ai-core/package.json
COPY packages/ai-strategies/package.json packages/ai-strategies/package.json
COPY packages/ai-manager/package.json packages/ai-manager/package.json
COPY packages/difficulty/package.json packages/difficulty/package.json
COPY packages/sim/package.json packages/sim/package.json
COPY packages/board/package.json packages/board/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/entities/package.json packages/entities/package.json
COPY packages/scoring/package.json packages/scoring/package.json
COPY packages/utils/package.json packages/utils/package.json

RUN npm ci

COPY . .
RUN npm run build --workspace @tdc/web

FROM nginx:alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
