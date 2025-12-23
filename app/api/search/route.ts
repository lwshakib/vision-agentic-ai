import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

const MAX_RESULTS = 20;

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("q") || "").trim();

  if (!query) {
    return NextResponse.json([]);
  }

  const term = `%${query}%`;

  const results = await prisma.$queryRaw<
    { id: string; title: string | null }[]
  >`
    SELECT c.id, c.title, MAX(m."createdAt") AS "lastMessageAt"
    FROM "Chat" c
    LEFT JOIN "Message" m ON m."chatId" = c.id
    WHERE c."clerkId" = ${user.id}
      AND (
        c.title ILIKE ${term}
        OR EXISTS (
          SELECT 1
          FROM "Message" m2
          WHERE m2."chatId" = c.id
            AND m2.parts::text ILIKE ${term}
        )
      )
    GROUP BY c.id
    ORDER BY "lastMessageAt" DESC NULLS LAST
    LIMIT ${MAX_RESULTS};
  `;

  return NextResponse.json(
    results.map((r) => ({
      id: r.id,
      title: r.title || "Untitled chat",
      url: `/~/${r.id}`,
    }))
  );
}
