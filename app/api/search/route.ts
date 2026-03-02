/**
 * Global Search API Route
 * This route enables full-text search across a user's chat titles and message contents.
 */

import { NextResponse } from 'next/server';
// Import utility to verify the user's session.
import { getUser } from '@/actions/user';
// Import the prisma client for raw SQL query execution.
import prisma from '@/lib/prisma';

// Define the maximum number of search results to return to the client.
const MAX_RESULTS = 20;

/**
 * GET Handler - Performs a cross-entity search for the provided query string.
 */
export async function GET(req: Request) {
  // Ensure only authenticated users can perform searches.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse the search query from the URL search parameters.
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get('q') || '').trim();

  // If no query is provided, return an empty array immediately.
  if (!query) {
    return NextResponse.json([]);
  }

  // Prepare the search term for SQL ILIKE (case-insensitive partial match).
  const term = `%${query}%`;

  /**
   * Execute a raw SQL query to perform a complex search.
   * This query checks for matches in both chat titles and the JSONB 'parts' field of messages.
   */
  const results = await prisma.$queryRaw<
    { id: string; title: string | null }[]
  >`
    SELECT c.id, c.title, MAX(m."createdAt") AS "lastMessageAt"
    FROM "Chat" c
    LEFT JOIN "Message" m ON m."chatId" = c.id
    WHERE c."userId" = ${user.id}
      AND (
        -- Match the chat title.
        c.title ILIKE ${term}
        -- OR match any message content within the chat.
        OR EXISTS (
          SELECT 1
          FROM "Message" m2
          WHERE m2."chatId" = c.id
          AND m2.parts::text ILIKE ${term} -- Cast JSONB to text for searching.
        )
      )
    GROUP BY c.id
    -- Order results by recency (most recently active chats first).
    ORDER BY "lastMessageAt" DESC NULLS LAST
    LIMIT ${MAX_RESULTS};
  `;

  // Return a formatted array of results including IDs, titles, and localized navigation URLs.
  return NextResponse.json(
    results.map((r) => ({
      id: r.id,
      title: r.title || 'Untitled chat',
      url: `/~/${r.id}`, // Internal application route for the chat.
    })),
  );
}
