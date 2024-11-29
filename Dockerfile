
# Use the official Node.js image as the base image
FROM node:20.16.0

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
