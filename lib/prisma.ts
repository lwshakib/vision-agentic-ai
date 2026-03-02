/**
 * Prisma Database Client Configuration
 * This module ensures a single shared Prisma instance is used across the application.
 */

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

// Construct the database connection string from environment variables.
const connectionString = `${process.env.DATABASE_URL}`;

// Initialize the edge-compatible PostgreSQL adapter.
const adapter = new PrismaPg({ connectionString });

// Global variable to prevent multiple instances of Prisma in development (which causes hot-reloading issues).
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Create the client or reuse the existing global one.
const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

// Persist the instance to the global object in non-production environments.
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
