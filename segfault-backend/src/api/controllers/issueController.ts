import type { Request, Response } from "express";
// Fix: import Prisma namespace from @prisma/client to avoid local path resolution issues
import { Prisma } from "@prisma/client";
import * as turf from "@turf/turf";
import {
    createAuthenticatedIssue,
    createGuestIssue,
    getIssueById,
    getIssuesByLocationBox,
    addIssueUpvote,
    removeIssueUpvote,
    getIssueUpvoteCount,
    hasUserUpvotedIssue,
} from "../../data/issue";
import { prisma } from "../../data/prisma/prismaClient";
import { IssueStatus, IssueType } from "../../generated/prisma/enums";
import { recalculatePenalties } from "../../services/PenaltyService";
import { sendToModerationQueue } from "../../services/QueueService";
import { uploadToBlob } from "../../services/BlobStorageService";

const ISSUE_TYPE_INFO: Record<string, { name: string; department: string }> = {
    POTHOLE: { name: "Pothole", department: "Public Works Department" },
    ROAD_DAMAGE: { name: "Road Damage", department: "Public Works Department" },
    STREETLIGHT_FAULT: { name: "Streetlight Fault", department: "Electrical Department" },
    GARBAGE_UNCOLLECTED: { name: "Garbage Uncollected", department: "Sanitation Department" },
    ILLEGAL_DUMPING: { name: "Illegal Dumping", department: "Sanitation Department" },
    DRAINAGE_BLOCKED: { name: "Drainage Blocked", department: "Water Department" },
    SEWAGE_OVERFLOW: { name: "Sewage Overflow", department: "Water Department" },
    WATER_SUPPLY_ISSUE: { name: "Water Supply Issue", department: "Water Department" },
    LOW_WATER_PRESSURE: { name: "Low Water Pressure", department: "Water Department" },
    OPEN_MANHOLE: { name: "Open Manhole", department: "Public Works Department" },
    BROKEN_FOOTPATH: { name: "Broken Footpath", department: "Public Works Department" },
    ILLEGAL_ENCROACHMENT: { name: "Illegal Encroachment", department: "Municipal Corporation" },
    STRAY_CATTLE: { name: "Stray Cattle", department: "Animal Control" },
    TREE_FALL: { name: "Tree Fall", department: "Parks Department" },
    TRAFFIC_LIGHT_FAULT: { name: "Traffic Light Fault", department: "Traffic Department" },
    MOSQUITO_BREEDING: { name: "Mosquito Breeding", department: "Health Department" },
    NOISE_COMPLAINT: { name: "Noise Complaint", department: "Municipal Corporation" },
    BUILDING_SAFETY: { name: "Building Safety", department: "Building Department" },
};

export async function getIssues(req: Request, res: Response) {
    try {
        const { type, status, showResolved } = req.query;

        // Build dynamic WHERE clause parts (validated enum values only)
        const conditions: string[] = ['i.location IS NOT NULL'];
        
        if (type && typeof type === "string") {
            conditions.push(`i."issueType" = '${type}'::"IssueType"`);
        }

        if (status && typeof status === "string") {
            conditions.push(`i.status = '${status}'::"IssueStatus"`);
        } else if (showResolved !== "true") {
            conditions.push(`i.status != 'RESOLVED'::"IssueStatus"`);
        }

        const whereClause = conditions.length ? conditions.join(' AND ') : 'TRUE';

        // Build full SQL string and execute with $queryRawUnsafe to avoid Prisma raw fragment issues
        const sql = `
            SELECT 
                i.id, i.title, i."issueType", i.status, i.description,
                ST_Y(i.location) AS latitude,
                ST_X(i.location) AS longitude,
                i."createdAt", i."userId", i."guestTokenId",
                u.name AS user_name,
                COALESCE(uv.upvote_count, 0) AS upvote_count,
                COALESCE(cm.comment_count, 0) AS comment_count
            FROM "Issue" i
            LEFT JOIN "User" u ON i."userId" = u.id
            LEFT JOIN (
                SELECT "issueId", COUNT(*) AS upvote_count 
                FROM "IssueUpvote" 
                GROUP BY "issueId"
            ) uv ON i.id = uv."issueId"
            LEFT JOIN (
                SELECT "issueId", COUNT(*) AS comment_count 
                FROM "Comment" 
                GROUP BY "issueId"
            ) cm ON i.id = cm."issueId"
            WHERE ${whereClause}
            ORDER BY i."createdAt" DESC
            LIMIT 100
        `;

        const issues = await prisma.$queryRawUnsafe(sql) as Array<{
            id: number;
            title: string;
            issueType: string;
            status: string;
            description: string;
            latitude: number;
            longitude: number;
            createdAt: Date;
            userId: number;
            guestTokenId: number | null;
            user_name: string | null;
            upvote_count: number;
            comment_count: number;
        }>;

        const formatted = issues.map((issue) => ({
            id: String(issue.id),
            title: issue.title,
            type: issue.issueType,
            status: issue.status,
            description: issue.description,
            location: `${issue.latitude}, ${issue.longitude}`,
            lat: issue.latitude,
            lng: issue.longitude,
            voteCount: Number(issue.upvote_count),
            commentCount: Number(issue.comment_count),
            reportedAt: issue.createdAt.toISOString(),
            reporterId: issue.guestTokenId ? undefined : String(issue.userId),
        }));

        return res.json(formatted);
    } catch (err) {
        console.error("Error fetching issues:", err);
        return res.status(500).json({ error: "Failed to fetch issues" });
    }
}

export async function getIssueTypes(_req: Request, res: Response) {
    try {
        const types = Object.entries(ISSUE_TYPE_INFO).map(([id, info]) => ({
            id,
            name: info.name,
            department: info.department,
            description: `Report ${info.name.toLowerCase()} issues`,
        }));

        return res.json(types);
    } catch (err) {
        console.error("Error fetching issue types:", err);
        return res.status(500).json({ error: "Failed to fetch issue types" });
    }
}

export async function getIssue(req: Request, res: Response) {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ error: "Issue ID is required" });
        }
        const issueId = parseInt(id);

        if (isNaN(issueId)) {
            return res.status(400).json({ error: "Invalid issue ID" });
        }

        const issue = await getIssueById(issueId);
        if (!issue) {
            return res.status(404).json({ error: "Issue not found" });
        }

        let hasVoted = false;
        if (req.user && req.user.id !== -1) {
            hasVoted = await hasUserUpvotedIssue(req.user.id, issueId);
        }

        const formatted = {
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
            hasVoted,
            reportedAt: issue.createdAt.toISOString(),
            reporter: issue.guestTokenId || !issue.user
                ? { name: "Anonymous", isGuest: true }
                : { id: String(issue.user.id), name: issue.user.name, email: issue.user.email },
        };

        return res.json(formatted);
    } catch (err) {
        console.error("Error fetching issue:", err);
        return res.status(500).json({ error: "Failed to fetch issue" });
    }
}

export async function createIssue(req: Request, res: Response) {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const { type, description, lat, lng, isAnonymous } = req.body;

        if (!type || !description) {
            return res.status(400).json({ error: "Type and description are required" });
        }

        const issueType = type as IssueType;
        if (!Object.values(IssueType).includes(issueType)) {
            return res.status(400).json({ error: "Invalid issue type" });
        }

        const latitude = parseFloat(lat) || 0;
        const longitude = parseFloat(lng) || 0;
        const title = `${ISSUE_TYPE_INFO[issueType]?.name || type} Report`;

        // Get uploaded file from multer memory storage (if any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const uploadedFile = (req as any).file as { buffer: Buffer; originalname: string } | undefined;

        // Upload to Azure Blob Storage if file exists
        let blobUrl: string | null = null;
        let imageBlobId: string | undefined;

        if (uploadedFile) {
            const uploadResult = await uploadToBlob(uploadedFile.buffer, uploadedFile.originalname);
            if (uploadResult) {
                blobUrl = uploadResult.blobUrl;
                imageBlobId = uploadResult.blobName;
            }
        }

        let issue;
        if (req.user.role === "GUEST" && req.user.guestTokenId) {
            issue = await createGuestIssue(title, description, latitude, longitude, issueType, req.user.guestTokenId, imageBlobId);
        } else {
            issue = await createAuthenticatedIssue(title, description, latitude, longitude, issueType, req.user.id, imageBlobId);
        }

        if (!issue) {
            console.error("Issue creation returned null/undefined");
            return res.status(500).json({ error: "Failed to create issue" });
        }

        recalculatePenalties().catch((err) =>
            console.error("Failed to recalculate penalties:", err)
        );

        // Always send to moderation queue - Azure Function will authorize the issue
        sendToModerationQueue({
            issueId: issue.id,
            blobUrl: blobUrl || "",
            latitude,
            longitude,
            issueType,
        }).catch((err) => console.error("Failed to queue moderation:", err));

        return res.status(201).json({
            id: String(issue.id),
            title: issue.title,
            type: issue.issueType,
            status: issue.status,
            description: issue.description,
            location: `${issue.latitude}, ${issue.longitude}`,
            imageBlobId: issue.imageBlobId,
            reportedAt: issue.createdAt.toISOString(),
        });
    } catch (err) {
        console.error("Error creating issue:", err);
        return res.status(500).json({ error: "Failed to create issue" });
    }
}

export async function voteOnIssue(req: Request, res: Response) {
    try {
        if (!req.user || req.user.id === -1) {
            return res.status(401).json({ error: "Authenticated user required to vote" });
        }

        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ error: "Issue ID is required" });
        }
        const issueId = parseInt(id);

        if (isNaN(issueId)) {
            return res.status(400).json({ error: "Invalid issue ID" });
        }

        const issue = await getIssueById(issueId);
        if (!issue) {
            return res.status(404).json({ error: "Issue not found" });
        }

        // PostGIS-based geofencing check - users must be within 5km of the issue
        const { userLat, userLng } = req.body;
        if (userLat === undefined || userLng === undefined) {
            return res.status(400).json({ error: "Location required to vote. Please enable location access." });
        }

        // Use PostGIS to check distance instead of turf.js
        const distanceCheck = await prisma.$queryRaw<{ distance_meters: number }[]>`
            SELECT ST_Distance(
                ST_SetSRID(ST_MakePoint(${issue.longitude}, ${issue.latitude}), 4326)::geography,
                ST_SetSRID(ST_MakePoint(${userLng}, ${userLat}), 4326)::geography
            ) as distance_meters
        `;

        const distance = distanceCheck[0]?.distance_meters || Infinity;
        if (distance > 5000) { // 5km in meters
            return res.status(403).json({ error: "You must be within 5km of the issue to vote." });
        }

        const hasVoted = await hasUserUpvotedIssue(req.user.id, issueId);

        if (hasVoted) {
            await removeIssueUpvote(req.user.id, issueId);
        } else {
            await addIssueUpvote(req.user.id, issueId);
        }

        const voteCount = await getIssueUpvoteCount(issueId);

        return res.json({ voteCount, hasVoted: !hasVoted });
    } catch (err) {
        console.error("Error voting on issue:", err);
        return res.status(500).json({ error: "Failed to vote on issue" });
    }
}

export async function getIssuesInBounds(req: Request, res: Response) {
    try {
        // Parse query parameters - they arrive as strings
        const minLat = parseFloat(req.query.minLat as string);
        const maxLat = parseFloat(req.query.maxLat as string);
        const minLng = parseFloat(req.query.minLng as string);
        const maxLng = parseFloat(req.query.maxLng as string);

        // Validate required parameters
        if (isNaN(minLat) || isNaN(maxLat) || isNaN(minLng) || isNaN(maxLng)) {
            return res.status(400).json({
                error: "Invalid bounds. Required: minLat, maxLat, minLng, maxLng as valid numbers",
            });
        }

        // Use the cache service for fast loading
        const { getIssuesInBounds: getCachedIssues } = await import("../../services/IssueCacheService");
        const showResolved = req.query.showResolved === 'true';
        const cachedIssues = await getCachedIssues(minLat, maxLat, minLng, maxLng, showResolved);

        // Calculate urgency score and format response
        const now = new Date();
        const issueType = req.query.type as string | undefined;
        const statusOpen = req.query.statusOpen === 'true';
        const statusInProgress = req.query.statusInProgress === 'true';
        const urgencyFilter = req.query.urgency as string | undefined;

        console.log(`[MapDebug] Filters: Type=${issueType}, Open=${statusOpen}, InProgress=${statusInProgress}, Urgency=${urgencyFilter}, ShowResolved=${showResolved}`);
        console.log(`[MapDebug] Raw issues from cache/DB: ${cachedIssues.length}`);

        let formatted = cachedIssues.map((issue) => {
            // Calculate hours since creation
            const hoursSinceCreation = (now.getTime() - new Date(issue.createdAt).getTime()) / (1000 * 60 * 60);

            // Urgency formula: (hoursSinceCreation * 0.5) + (upvotes * 2), capped at 100
            const rawUrgency = hoursSinceCreation * 0.5 + issue.voteCount * 2;
            const urgencyScore = Math.min(100, Math.round(rawUrgency));

            return {
                id: String(issue.id),
                title: issue.title,
                type: issue.issueType,
                status: issue.status,
                lat: issue.latitude,
                lng: issue.longitude,
                voteCount: issue.voteCount,
                commentCount: issue.commentCount,
                urgencyScore,
                reportedAt: issue.createdAt,
            };
        });

        // Apply filters
        formatted = formatted.filter(issue => {
            // Type filter
            if (issueType && issue.type !== issueType) return false;

            // Status filter
            // Note: issue.status is from DB enum (OPEN, IN_PROGRESS, RESOLVED, REJECTED)
            // statusOpen covers OPEN (and PENDING if exists)
            // statusInProgress covers IN_PROGRESS
            // showResolved covers RESOLVED (handled partly in cache fetching but good to double check)

            let statusMatch = false;
            // logic: if NO status filters are active (logic suggests we default to showing something, but UI defaults to Open+InProgress selected)
            // If the UI passes these as flags, we check if the issue status matches an ACTIVE flag.

            if (issue.status === 'RESOLVED') {
                if (showResolved) statusMatch = true;
            } else if (issue.status === 'IN_PROGRESS') {
                if (statusInProgress) statusMatch = true;
            } else if (issue.status === 'OPEN' || issue.status === 'PENDING') { // Assuming PENDING might exist in enum or just OPEN
                if (statusOpen) statusMatch = true;
            } else {
                // For other statuses (e.g. REJECTED), default to showing if nothing else matches? 
                // Or maybe strict filtering. Let's assume strict based on checkboxes.
                // If the issue is REJECTED, and we don't have a checkbox for it, it might hide?
                // Let's assume statusOpen covers 'OPEN'
                if (statusOpen) statusMatch = true; // Fallback for basic OPEN
            }

            if (!statusMatch) return false;

            // Urgency filter
            if (urgencyFilter) {
                if (urgencyFilter === 'CRITICAL' && issue.urgencyScore < 80) return false;
                if (urgencyFilter === 'HIGH' && issue.urgencyScore < 60) return false;
                if (urgencyFilter === 'MEDIUM' && issue.urgencyScore < 40) return false;
                if (urgencyFilter === 'LOW' && issue.urgencyScore >= 40) return false; // Low implies strictly low? Map usually filters inclusive?
                // Let's assume inclusive logic or simple thresholds
            }

            return true;
        });

        console.log(`[MapDebug] Returning ${formatted.length} issues after filtering`);

        return res.json(formatted);
    } catch (err) {
        console.error("Error fetching map issues:", err);
        return res.status(500).json({ error: "Failed to fetch map issues" });
    }
}

export async function updateIssueStatus(req: Request, res: Response) {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }

        if (req.user.role !== "ADMIN") {
            return res.status(403).json({ error: "Admin access required" });
        }

        const issueId = parseInt(req.params.id || "");
        if (isNaN(issueId)) {
            return res.status(400).json({ error: "Invalid issue ID" });
        }

        const { status } = req.body;
        if (!status || !Object.values(IssueStatus).includes(status)) {
            return res.status(400).json({ error: "Invalid status value" });
        }

        const issue = await prisma.issue.findUnique({
            where: { id: issueId },
            select: { userId: true, status: true },
        });

        if (!issue) {
            return res.status(404).json({ error: "Issue not found" });
        }

        const prevStatus = issue.status;

        const updated = await prisma.issue.update({
            where: { id: issueId },
            data: { status: status as IssueStatus },
        });

        if (status === IssueStatus.RESOLVED && prevStatus !== IssueStatus.RESOLVED) {
            const { awardPoints } = await import("../../services/GamificationService");
            awardPoints(issue.userId, 20).catch((err) =>
                console.error("Failed to award points for resolution:", err)
            );
        }

        return res.json({
            id: String(updated.id),
            status: updated.status,
            message: "Status updated successfully",
        });
    } catch (err) {
        console.error("Error updating issue status:", err);
        return res.status(500).json({ error: "Failed to update status" });
    }
}

export default { getIssues, getIssueTypes, getIssue, createIssue, voteOnIssue, getIssuesInBounds, updateIssueStatus };
