import { prisma } from "../data/prisma/prismaClient";

const BADGE_THRESHOLDS: Record<string, number> = {
    Observer: 10,
    Activist: 100,
    Guardian: 500,
};

export async function awardPoints(userId: number, points: number): Promise<{ newCredibility: number; newBadges: string[] }> {
    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
            credibility: { increment: points },
        },
        select: {
            credibility: true,
        },
    });

    const newBadges = await checkAndAwardBadges(userId, updatedUser.credibility);

    return {
        newCredibility: updatedUser.credibility,
        newBadges,
    };
}

async function checkAndAwardBadges(userId: number, credibility: number): Promise<string[]> {
    const newlyAwarded: string[] = [];

    for (const [badgeName, threshold] of Object.entries(BADGE_THRESHOLDS)) {
        if (credibility < threshold) {
            continue;
        }

        const existingBadge = await prisma.userBadge.findFirst({
            where: {
                userId,
                name: badgeName,
            },
        });

        if (existingBadge) {
            continue;
        }

        await prisma.userBadge.create({
            data: {
                userId,
                name: badgeName,
            },
        });

        newlyAwarded.push(badgeName);
    }

    return newlyAwarded;
}

export async function getUserCredibility(userId: number): Promise<{ credibility: number; badges: string[] }> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            credibility: true,
            badges: {
                select: { name: true },
                orderBy: { awardedAt: "asc" },
            },
        },
    });

    if (!user) {
        return { credibility: 0, badges: [] };
    }

    return {
        credibility: user.credibility,
        badges: user.badges.map((b) => b.name),
    };
}

export default { awardPoints, getUserCredibility };
