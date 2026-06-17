# Builda o client (Vite) com Bun e serve o estático via nginx
# build context = raiz do projeto
FROM oven/bun:1.2-alpine AS build
WORKDIR /app
COPY client/package.json ./
RUN bun install
COPY client ./client
RUN bun run build

FROM nginx:1.27-alpine-slim
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist /usr/share/nginx/html
EXPOSE 80
