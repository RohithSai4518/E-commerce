# Production Dockerfile for AuraCommerce Platform
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package manifest and application source
COPY package.json package-lock.json ./
COPY . .

# Expose HTTP port
EXPOSE 3000

# Environment configuration
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Start server
CMD ["npm", "start"]
