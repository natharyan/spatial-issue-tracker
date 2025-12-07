import type { Request, Response } from "express";
import { prisma } from "../../data/prisma/prismaClient";
import { IssueStatus } from "../../generated/prisma/enums";
import { awardPoints } from "../../services/GamificationService";

const AUTO_REVERT_THRESHOLD = -5;

export async function castResolutionVote(req: Request, res: Response) {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const issueId = parseInt(req.params.id || "");
        if (isNaN(issueId)) {
            return res.status(400).json({ error: "Invalid issue ID" });
        }

        const { isVerified } = req.body;
        if (typeof isVerified !== "boolean") {
            return res.status(400).json({ error: "isVerified must be a boolean" });
        }

        const issue = await prisma.issue.findUnique({
            where: { id: issueId },
        });

        if (!issue) {
            return res.status(404).json({ error: "Issue not found" });
        }

        if (issue.status !== IssueStatus.RESOLVED) {
            return res.status(400).json({ error: "Can only vote on resolved issues" });
        }

        const existingVote = await prisma.issueResolutionVote.findUnique({
            where: {
                issueId_userId: {
                    issueId,
                    userId: req.user.id,
                },
            },
        });

        if (existingVote) {
            await prisma.issueResolutionVote.update({
                where: { id: existingVote.id },
                data: { isResolved: isVerified },
            });
        } else {
            await prisma.issueResolutionVote.create({
                data: {
                    issueId,
                    userId: req.user.id,
                    isResolved: isVerified,
                },
            });

            if (isVerified) {
                awardPoints(req.user.id, 10).catch((err) =>
                    console.error("Failed to award resolution vote points:", err)
                );
            }
        }

        const netScore = await calculateNetScore(issueId);

        if (netScore <= AUTO_REVERT_THRESHOLD) {
            await revertIssue(issueId, req.user.id);
            return res.json({
                message: "Vote recorded. Issue reopened by community consensus.",
                netScore,
                reverted: true,
            });
        }

        return res.json({
            message: "Vote recorded",
            netScore,
            reverted: false,
        });
    } catch (err) {
        console.error("Error casting resolution vote:", err);
        return res.status(500).json({ error: "Failed to record vote" });
    }
}

async function calculateNetScore(issueId: number): Promise<number> {
    const votes = await prisma.issueResolutionVote.findMany({
        where: { issueId },
        select: { isResolved: true },
    });

    let score = 0;
    for (const vote of votes) {
        score += vote.isResolved ? 1 : -1;
    }
    return score;
}

async function revertIssue(issueId: number, triggeredByUserId: number): Promise<void> {
    await prisma.issue.update({
        where: { id: issueId },
        data: { status: IssueStatus.IN_PROGRESS },
    });

    await prisma.comment.create({
        data: {
            content: "Issue reopened by community consensus. Multiple users reported the fix was insufficient.",
            issueId,
            userId: triggeredByUserId,
            isSystemGenerated: true,
        },
    });

    await prisma.issueResolutionVote.deleteMany({
        where: { issueId },
    });
}

export async function getResolutionVotes(req: Request, res: Response) {
    try {
        const issueId = parseInt(req.params.id || "");
        if (isNaN(issueId)) {
            return res.status(400).json({ error: "Invalid issue ID" });
        }

        const votes = await prisma.issueResolutionVote.findMany({
            where: { issueId },
            select: { isResolved: true },
        });

        const verified = votes.filter((v) => v.isResolved).length;
        const notFixed = votes.filter((v) => !v.isResolved).length;

        let userVote = null;
        if (req.user) {
            const vote = await prisma.issueResolutionVote.findUnique({
                where: {
                    issueId_userId: {
                        issueId,
                        userId: req.user.id,
                    },
                },
            });
            userVote = vote ? vote.isResolved : null;
        }

        return res.json({
            verified,
            notFixed,
            netScore: verified - notFixed,
            userVote,
        });
    } catch (err) {
        console.error("Error getting resolution votes:", err);
        return res.status(500).json({ error: "Failed to get votes" });
    }
}

export default { castResolutionVote, getResolutionVotes };
