# El servidor de juego (apps/server) para Fly.io. Corre el TypeScript con tsx, como en desarrollo:
# los paquetes del monorepo (engine, bots, shared) se usan desde su código fuente.
FROM node:24-slim
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile --filter @truco/server...
ENV NODE_ENV=production
ENV PORT=2567
EXPOSE 2567
CMD ["pnpm", "--filter", "@truco/server", "start"]
