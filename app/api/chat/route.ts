import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUser } from "@/actions/user";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chats = await prisma.chat.findMany({
    where: {
      userId: user.id,
      isOnProject: false,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
    },
  });

  return NextResponse.json(chats);
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }


  const chat = await prisma.chat.create({
    data: {
      userId: user.id,
      title: "New chat",
    },
    select: {
      id: true,
    },
  });

  return NextResponse.json({ chatId: chat.id });
}
