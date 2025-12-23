import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getUser } from "@/actions/user";

type Params = {
  params: Promise<{ projectId: string }>;
};

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: user.id,
    },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const chats = await prisma.chat.findMany({
    where: {
      projectId,
      userId: user.id,
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
