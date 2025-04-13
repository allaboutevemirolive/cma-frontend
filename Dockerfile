# Stage 1: Builder - Install dependencies and build the app
FROM node:20-alpine AS builder

# Enable pnpm via corepack
# RUN corepack enable
# RUN corepack prepare pnpm@latest --activate

WORKDIR /app
# Install pnpm
RUN npm install -g pnpm

# Copy only necessary files for dependency installation
COPY package.json pnpm-lock.yaml ./

# Install dependencies using the lockfile
# Use --frozen-lockfile for CI/CD assurance, --prod could be used if you only needed runtime deps later
# but for build, we need devDependencies too.
RUN pnpm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the application
# Pass build-time environment variables if needed (e.g., API URL)
# Example: ARG VITE_API_BASE_URL
# ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN pnpm build

# Stage 2: Runner - Serve the built app with Nginx
FROM nginx:stable-alpine AS runner

# Copy the build output from the builder stage to Nginx's web root
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy the custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (Nginx default)
EXPOSE 80

# Start Nginx when the container launches
CMD ["nginx", "-g", "daemon off;"]
