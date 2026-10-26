FROM node:22-alpine
WORKDIR /app
COPY index.html ./
COPY server ./server
RUN cd server && npm ci --omit=dev
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server/server.js"]
