FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
COPY scripts/build.mjs scripts/build.mjs
COPY index.html design-system.html work.html ./
COPY projects ./projects
COPY assets ./assets
RUN node scripts/build.mjs

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
COPY --chown=node:node scripts/serve.mjs ./scripts/serve.mjs
USER node
EXPOSE 8080
CMD ["node", "scripts/serve.mjs"]
