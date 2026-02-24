# Development Dockerfile for Medusa
FROM node:20-alpine

RUN corepack enable && corepack prepare yarn@4.12.0 --activate

# Set working directory
WORKDIR /server

# Copy package files and yarn config
COPY package.json yarn.lock .yarnrc.yml .yarn/releases ./

# Force using Corepack yarn instead of project-local yarnPath
RUN sed -i '/^yarnPath:/d' .yarnrc.yml

# Install all dependencies using yarn
RUN yarn install

# Copy source code
COPY . .

# Expose the port Medusa runs on
EXPOSE 9000 5173

# Start with migrations and then the development server
CMD ["./start.sh"]