FROM node:20-bookworm-slim

WORKDIR /app

# Install dependencies first (better cache usage)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

ENV NODE_ENV=production
ENV PORT=8181

EXPOSE 8181

CMD ["npm", "start"]
