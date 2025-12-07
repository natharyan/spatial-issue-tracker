import type { Request, Response } from "express";
import { prisma } from "../../data/prisma/prismaClient";

// Helper to get formatted profile
export async function getMe(req: Request, res: Response) {
    try {
        if (!req.user || req.user.id === -1) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                badges: true,
                _count: {
                    select: {
                        issues: true,
                        comments: true,
                        issueUpvotes: true, // Upvotes given
                        commentUpvotes: true, // Upvotes given
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Calculate some extra stats if needed
        // For now return what we have
        return res.json({
            id: String(user.id),
            name: user.name,
            email: user.email,
            picture: user.picture,
            role: user.role,
            credibility: user.credibility,
            badges: user.badges.map(b => ({
                id: b.id,
                name: b.name,
                awardedAt: b.awardedAt
            })),
            stats: {
                issuesReported: user._count.issues,
                commentsPosted: user._count.comments,
                points: user.credibility // assuming credibility is points
            }
        });
    } catch (err) {
        console.error("Error getting user profile:", err);
        return res.status(500).json({ error: "Failed to get profile" });
    }
}

export async function getMyIssues(req: Request, res: Response) {
    try {
        if (!req.user || req.user.id === -1) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const issues = await prisma.issue.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { upvotes: true, comments: true } }
            }
        });

        // Format similarly to issueController
        const formatted = issues.map((issue) => ({
            id: String(issue.id),
            title: issue.title,
            type: issue.issueType,
            status: issue.status,
            description: issue.description,
            location: `${issue.latitude}, ${issue.longitude}`,
            lat: issue.latitude,
            lng: issue.longitude,
            voteCount: issue._count.upvotes,
            commentCount: issue._count.comments,
            reportedAt: issue.createdAt.toISOString(),
        }));

        return res.json(formatted);
    } catch (err) {
        console.error("Error fetching user issues:", err);
        return res.status(500).json({ error: "Failed to fetch issues" });
    }
}

export async function getMyComments(req: Request, res: Response) {
    try {
        if (!req.user || req.user.id === -1) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const comments = await prisma.comment.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            include: {
                issue: {
                    select: {
                        id: true,
                        title: true
                    }
                },
                upvotes: true
            }
        });

        const formatted = comments.map(comment => ({
            id: String(comment.id),
            content: comment.content,
            createdAt: comment.createdAt.toISOString(),
            issueId: String(comment.issueId),
            issueTitle: comment.issue.title,
            upvoteCount: comment.upvotes.length
        }));

        return res.json(formatted);

    } catch (err) {
        console.error("Error fetching user comments:", err);
        return res.status(500).json({ error: "Failed to fetch comments" });
    }
}

export default { getMe, getMyIssues, getMyComments };
