# The API is the root package, so only its own dependencies are installed
# (--workspaces=false keeps the frontend out of the image).
FROM node:22-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json ./
RUN npm ci --workspaces=false
COPY tsconfig.json tsconfig.build.json ./
COPY backend backend
RUN npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /repo
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --workspaces=false && npm cache clean --force
COPY --from=build /repo/dist dist
COPY drizzle drizzle
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
