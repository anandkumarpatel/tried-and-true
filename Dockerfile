
# Use the official Node.js image as the base image
FROM node:20-alpine

RUN apk add --no-cache \
    ca-certificates \
    curl \
    udev \
    ttf-freefont \
    chromium


ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV DB=/db
# Set the working directory
WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm install

COPY server.js .env.backend ./

# Install dependencies

# Expose the port the app runs on
EXPOSE 3000

# Command to run the app
CMD ["node", "server.js"]
