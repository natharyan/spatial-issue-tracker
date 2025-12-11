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
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const issues = await prisma.$queryRaw<Array<{
            id: number;
            title: string;
            issueType: string;
            status: string;
            latitude: number;
            longitude: number;
            createdAt: Date;
            upvote_count: bigint;
            comment_count: bigint;
        }>>`
            SELECT 
                i.id, i.title, i."issueType", i.status,
                ST_Y(i.location) as latitude,
                ST_X(i.location) as longitude,
                i."createdAt",
                COALESCE(uv.upvote_count, 0) as upvote_count,
                COALESCE(cm.comment_count, 0) as comment_count
            FROM "Issue" i
            LEFT JOIN (
                SELECT "issueId", COUNT(*) as upvote_count 
                FROM "IssueUpvote" 
                GROUP BY "issueId"
            ) uv ON i.id = uv."issueId"
            LEFT JOIN (
                SELECT "issueId", COUNT(*) as comment_count 
                FROM "Comment" 
                GROUP BY "issueId"
            ) cm ON i.id = cm."issueId"
            WHERE i."userId" = ${userId}
            AND i.location IS NOT NULL
            ORDER BY i."createdAt" DESC
        `;

        const formatted = issues.map((issue) => ({
            id: String(issue.id),
            title: issue.title,
            type: issue.issueType,
            status: issue.status,
            location: `${issue.latitude}, ${issue.longitude}`,
            lat: issue.latitude,
            lng: issue.longitude,
            voteCount: Number(issue.upvote_count),
            commentCount: Number(issue.comment_count),
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
