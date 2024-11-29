
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

# Copy only server.js and package.json
COPY server.js package.json package-lock.json .env.backend ./

# Install dependencies
RUN npm install

# Expose the port the app runs on
EXPOSE 3000

# Command to run the app
CMD ["node", "server.js"]
