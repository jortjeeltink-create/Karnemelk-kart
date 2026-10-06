# Karnemelk Kart server
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY server ./server
COPY public ./public
ENV PORT=3000 DATA_DIR=/data NODE_ENV=production
VOLUME ["/data"]
EXPOSE 3000
CMD ["node", "server/index.js"]
