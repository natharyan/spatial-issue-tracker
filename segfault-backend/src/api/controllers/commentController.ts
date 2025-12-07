import type { Request, Response } from "express";
import * as turf from "@turf/turf";
import {
    addComment,
    getCommentsForIssue,
    deleteComment,
    flagComment,
    addCommentUpvote,
    removeCommentUpvote,
} from "../../data/issue";
import { prisma } from "../../data/prisma/prismaClient";
import { awardPoints } from "../../services/GamificationService";

export async function getComments(req: Request, res: Response) {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ error: "Issue ID is required" });
        }
        const issueId = parseInt(id);

        if (isNaN(issueId)) {
            return res.status(400).json({ error: "Invalid issue ID" });
        }

        const comments = await getCommentsForIssue(issueId);

        const formatted = comments.map((comment) => ({
            id: String(comment.id),
            content: comment.content,
            createdAt: comment.createdAt.toISOString(),
            author: {
                id: String(comment.user.id),
                name: comment.user.name || "Anonymous",
                credibility: comment.user.credibility,
                badges: comment.user.badges.map((b) => b.name),
            },
            upvoteCount: comment.upvotes.length,
            hasUpvoted: req.user ? comment.upvotes.some((u) => u.userId === req.user!.id) : false,
            isFlagged: comment.isFlagged,
        }));

        return res.json(formatted);
    } catch (err) {
        console.error("Error fetching comments:", err);
        return res.status(500).json({ error: "Failed to fetch comments" });
    }
}

export async function createComment(req: Request, res: Response) {
    try {
        if (!req.user || req.user.id === -1) {
            return res.status(401).json({ error: "Authenticated user required to comment" });
        }

        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ error: "Issue ID is required" });
        }
        const issueId = parseInt(id);
        const { content } = req.body;

        if (isNaN(issueId)) {
            return res.status(400).json({ error: "Invalid issue ID" });
        }

        if (!content || typeof content !== "string" || content.trim().length === 0) {
            return res.status(400).json({ error: "Comment content is required" });
        }

        const issue = await prisma.issue.findUnique({ where: { id: issueId } });
        if (!issue) {
            return res.status(404).json({ error: "Issue not found" });
        }

        // Geofencing check - users must be within 5km of the issue
        const { userLat, userLng } = req.body;
        if (userLat === undefined || userLng === undefined) {
            return res.status(400).json({ error: "Location required to comment. Please enable location access." });
        }
        const userPoint = turf.point([userLng, userLat]);
        const issuePoint = turf.point([issue.longitude, issue.latitude]);
        const distance = turf.distance(userPoint, issuePoint, { units: "kilometers" });
        if (distance > 5) {
            return res.status(403).json({ error: "You must be within 5km of the issue to comment." });
        }

        const comment = await addComment(req.user.id, issueId, content.trim());

        return res.status(201).json({
            id: String(comment.id),
            content: comment.content,
            createdAt: comment.createdAt.toISOString(),
            author: {
                id: String(req.user.id),
                name: "You",
            },
            upvoteCount: 0,
            hasUpvoted: false,
        });
    } catch (err) {
        console.error("Error creating comment:", err);
        return res.status(500).json({ error: "Failed to create comment" });
    }
}

export async function removeComment(req: Request, res: Response) {
    try {
        if (!req.user || req.user.id === -1) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ error: "Comment ID is required" });
        }
        const commentId = parseInt(id);

        if (isNaN(commentId)) {
            return res.status(400).json({ error: "Invalid comment ID" });
        }

        const comment = await prisma.comment.findUnique({ where: { id: commentId } });
        if (!comment) {
            return res.status(404).json({ error: "Comment not found" });
        }

        if (comment.userId !== req.user.id && req.user.role !== "ADMIN") {
            return res.status(403).json({ error: "Not authorized to delete this comment" });
        }

        await deleteComment(commentId);

        return res.json({ success: true });
    } catch (err) {
        console.error("Error deleting comment:", err);
        return res.status(500).json({ error: "Failed to delete comment" });
    }
}

export async function upvoteComment(req: Request, res: Response) {
    try {
        if (!req.user || req.user.id === -1) {
            return res.status(401).json({ error: "Authenticated user required to upvote" });
        }

        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ error: "Comment ID is required" });
        }
        const commentId = parseInt(id);

        if (isNaN(commentId)) {
            return res.status(400).json({ error: "Invalid comment ID" });
        }

        const comment = await prisma.comment.findUnique({ where: { id: commentId } });
        if (!comment) {
            return res.status(404).json({ error: "Comment not found" });
        }

        if (comment.userId === req.user.id) {
            return res.status(400).json({ error: "Cannot upvote your own comment" });
        }

        const existing = await prisma.commentUpvote.findFirst({
            where: { commentId, userId: req.user.id },
        });

        if (existing) {
            await removeCommentUpvote(req.user.id, commentId);
        } else {
            await addCommentUpvote(req.user.id, commentId);
            awardPoints(comment.userId, 5).catch((err) =>
                console.error("Failed to award points:", err)
            );
        }

        const upvoteCount = await prisma.commentUpvote.count({ where: { commentId } });

        return res.json({ upvoteCount, hasUpvoted: !existing });
    } catch (err) {
        console.error("Error upvoting comment:", err);
        return res.status(500).json({ error: "Failed to upvote comment" });
    }
}

export async function reportComment(req: Request, res: Response) {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ error: "Comment ID is required" });
        }
        const commentId = parseInt(id);
        const { reason } = req.body;

        if (isNaN(commentId)) {
            return res.status(400).json({ error: "Invalid comment ID" });
        }

        const comment = await prisma.comment.findUnique({ where: { id: commentId } });
        if (!comment) {
            return res.status(404).json({ error: "Comment not found" });
        }

        await flagComment(commentId, reason || null);

        return res.json({ success: true });
    } catch (err) {
        console.error("Error flagging comment:", err);
        return res.status(500).json({ error: "Failed to flag comment" });
    }
}

export default { getComments, createComment, removeComment, upvoteComment, reportComment };
