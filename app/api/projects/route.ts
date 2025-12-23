import { NextResponse } from "next/server";
import { getUser } from "@/actions/user";
import prisma from "@/lib/prisma";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
    },
  });

  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const title = typeof body?.title === "string" ? body.title.trim() : "";

  if (!title) {
    return NextResponse.json(
      { error: "Project title is required" },
      { status: 400 }
    );
  }

  const project = await prisma.project.create({
    data: {
      title,
      userId: user.id,
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
    },
  });

  return NextResponse.json(project, { status: 201 });
}
