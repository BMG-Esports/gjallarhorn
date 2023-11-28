# Use the official Node.js 16 image as the base image
FROM node:16-slim

# Set the working directory
WORKDIR /app

# Copy package.jsons (including nested) and package-lock.json
COPY package.json package-lock.json .
COPY packages packages
RUN find packages \! -name "package.json" -mindepth 2 -maxdepth 2 -print | xargs rm -rf


# Define second build stage
FROM node:16-slim

WORKDIR /app
# Copy files from the first build stage.
COPY --from=0 /app .

# Install dependencies
RUN npm ci

# Copy other project files
COPY . .

# Build
RUN npm run build

ENV NODE_ENV=production
ENV GJALLARHORN_PORT=3000
ENV GJALLARHORN_STARTGG=
ENV GJALLARHORN_OUTPUT=/data/output
ENV GJALLARHORN_TEMP=/data/temp

EXPOSE 3000
EXPOSE 9229


CMD ["npm", "start"]
