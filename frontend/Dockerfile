# Build context is the repo root (see docker-compose.yml) because npm workspaces share one lockfile.
FROM node:22-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
RUN npm ci -w @school/frontend --include-workspace-root=false
COPY frontend frontend
RUN npm run build -w @school/frontend

FROM nginx:1.27-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/frontend/dist /usr/share/nginx/html
EXPOSE 80
