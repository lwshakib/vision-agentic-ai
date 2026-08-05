/**
 * Prisma Database Client Configuration
 * This module ensures a single shared Prisma instance is used across the application.
 */

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

const databaseUrl = process.env.DATABASE_URL;

// Validate that DATABASE_URL is present and non-empty to fail fast at startup
if (!databaseUrl || databaseUrl.trim() === '' || databaseUrl === 'undefined') {
  throw new Error(
    '[Prisma Client Initialization Error] Missing or invalid DATABASE_URL environment variable. ' +
      'Please configure DATABASE_URL in your environment or .env file.',
  );
}

// Initialize the edge-compatible PostgreSQL adapter.
const adapter = new PrismaPg({ connectionString: databaseUrl });

// Global variable to prevent multiple instances of Prisma in development (which causes hot-reloading issues).
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Create the client OR reuse the existing global one (Singleton pattern)
const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

// Persist the instance to the global object in development to prevent connection pooling exhaustion during hot reloads
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;

