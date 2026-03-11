import prisma from '@/lib/prisma';

/**
 * Checks and manages user credits.
 * Resets credits to 10 if a new day has started.
 * Returns the current credit count and whether the user can proceed.
 */
export async function checkAndManageCredits(userId: string) {
  // Fetch the user's current credit state from the database
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      messageCredits: true,
      lastCreditReset: true,
    },
  });

  if (!user) return { canProceed: false, messageCredits: 0 };

  const now = new Date();
  const lastReset = new Date(user.lastCreditReset);

  // Determine if credits should be replenished (daily reset logic)
  const isNewDay =
    now.getFullYear() > lastReset.getFullYear() ||
    now.getMonth() > lastReset.getMonth() ||
    now.getDate() > lastReset.getDate();

  if (isNewDay) {
    // Replenish credits to the daily allowance (10) and update the reset timestamp
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        messageCredits: 10,
        lastCreditReset: now,
      },
    });
    return { canProceed: true, messageCredits: updatedUser.messageCredits };
  }

  // User can proceed if they have at least 1 credit remaining
  return {
    canProceed: user.messageCredits > 0,
    messageCredits: user.messageCredits,
  };
}

/**
 * Decrements a user's credits by 1.
 */
export async function consumeCredit(userId: string) {
  return await prisma.user.update({
    where: { id: userId },
    data: {
      messageCredits: {
        decrement: 1,
      },
    },
  });
}
