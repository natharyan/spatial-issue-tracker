import type { Request, Response } from "express";
import { prisma } from "../../data/prisma/prismaClient";
import { IssueAuthorized, IssueError, IssueStatus } from "../../generated/prisma/enums";

// Get issues pending moderation (AI errors, unauthorized, or pending severity)
export async function getModerationQueue(_req: Request, res: Response) {
    try {
        const issues = await prisma.issue.findMany({
            where: {
                OR: [
                    { error: { not: IssueError.NONE } },
                    { authorized: IssueAuthorized.FALSE },
                    { severity: { equals: null } },
                ],
            },
            orderBy: { createdAt: "desc" },
            include: {
                user: { select: { id: true, name: true, email: true } },
            },
            take: 100,
        });

        const formatted = issues.map((issue) => ({
            id: String(issue.id),
            title: issue.title,
            description: issue.description,
            type: issue.issueType,
            status: issue.status,
            error: issue.error,
            authorized: issue.authorized,
            severity: issue.severity,
            imageBlobId: issue.imageBlobId,
            createdAt: issue.createdAt.toISOString(),
            reporter: {
                id: String(issue.user.id),
                name: issue.user.name || "Unknown",
                email: issue.user.email,
            },
        }));

        return res.json(formatted);
    } catch (err) {
        console.error("Error fetching moderation queue:", err);
        return res.status(500).json({ error: "Failed to fetch moderation queue" });
    }
}

// Approve or Reject an issue
export async function resolveModeration(req: Request, res: Response) {
    try {
        const issueId = parseInt(req.params.id || "");
        const { action } = req.body;

        if (isNaN(issueId)) {
            return res.status(400).json({ error: "Invalid issue ID" });
        }

        if (action !== "APPROVE" && action !== "REJECT") {
            return res.status(400).json({ error: "Invalid action. Use APPROVE or REJECT." });
        }

        const issue = await prisma.issue.findUnique({ where: { id: issueId } });
        if (!issue) {
            return res.status(404).json({ error: "Issue not found" });
        }

        if (action === "APPROVE") {
            await prisma.issue.update({
                where: { id: issueId },
                data: {
                    authorized: IssueAuthorized.TRUE,
                    error: IssueError.NONE,
                    status: IssueStatus.PENDING,
                },
            });
            return res.json({ success: true, message: "Issue approved." });
        } else {
            // REJECT: delete the issue
            await prisma.issue.delete({ where: { id: issueId } });
            return res.json({ success: true, message: "Issue rejected and deleted." });
        }
    } catch (err) {
        console.error("Error resolving moderation:", err);
        return res.status(500).json({ error: "Failed to resolve moderation" });
    }
}

// Get all users (paginated)
export async function getUsers(req: Request, res: Response) {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = 50;
        const skip = (page - 1) * pageSize;

        const [users, total] = await prisma.$transaction([
            prisma.user.findMany({
                skip,
                take: pageSize,
                orderBy: { id: "asc" },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    isBanned: true,
                    createdAt: true,
                },
            }),
            prisma.user.count(),
        ]);

        const formatted = users.map((u) => ({
            id: String(u.id),
            name: u.name || "No Name",
            email: u.email,
            role: u.role,
            isBanned: u.isBanned,
            createdAt: u.createdAt.toISOString(),
        }));

        return res.json({ users: formatted, total, page, pageSize });
    } catch (err) {
        console.error("Error fetching users:", err);
        return res.status(500).json({ error: "Failed to fetch users" });
    }
}

// Ban a user
export async function banUser(req: Request, res: Response) {
    try {
        const userId = parseInt(req.params.id || "");
        const { reason } = req.body;

        if (isNaN(userId)) {
            return res.status(400).json({ error: "Invalid user ID" });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                isBanned: true,
                banReason: reason || "Banned by admin",
            },
        });

        return res.json({ success: true, message: "User banned." });
    } catch (err) {
        console.error("Error banning user:", err);
        return res.status(500).json({ error: "Failed to ban user" });
    }
}

export default { getModerationQueue, resolveModeration, getUsers, banUser };
