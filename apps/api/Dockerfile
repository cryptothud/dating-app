FROM node:22-slim

WORKDIR /app

# Prisma engine binaries need openssl
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy monorepo manifests for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/ui/package.json ./packages/ui/

RUN pnpm install --frozen-lockfile

# Copy full source
COPY . .

# Generate Prisma client and compile
RUN pnpm --filter @dating-app/db exec prisma generate
RUN pnpm turbo build --filter=@dating-app/api

# Create non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nestjs

USER nestjs

EXPOSE 4000

CMD ["node", "apps/api/dist/main"]
