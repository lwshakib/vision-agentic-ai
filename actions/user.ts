import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";

export async function getOrCreateUser() {
  const user = await currentUser();
  if (!user) return null;
  try {
    const existUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
    });

    if (existUser) {
      return existUser;
    }

    const name = user.fullName ?? "";
    const email = user.emailAddresses[0]?.emailAddress ?? "";
    const imageUrl = user.imageUrl ?? "";
    const clerkId = user.id;

    const newUser = await prisma.user.create({
      data: {
        clerkId,
        name,
        email,
        imageUrl,
      },
    });

    return newUser;
  } catch (error) {
    if (error instanceof Error) {
      // Error handled silently
    }
    return null;
  }
}
