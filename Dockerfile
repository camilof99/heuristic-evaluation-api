# Development stage
FROM node:16 as development
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY ./src ./src
CMD [ "npm", "run", "start:dev" ]

# Builder stage
FROM development as builder
WORKDIR /usr/src/app
# Add a build script if needed (e.g., compiling TypeScript, generating files)
# RUN npm run build

# Production stage
FROM node:16-alpine as production
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/src ./src
# Add this line only if 'build' directory needs to be copied
# COPY --from=builder /usr/src/app/build ./build
CMD [ "node", "./build/server.js" ]
