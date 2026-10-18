# DevConnect API image
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies (cached layer)
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src

# Run as the non-root "node" user that ships with the image
USER node
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://localhost:4000/api/health || exit 1

CMD ["node", "src/server.js"]
