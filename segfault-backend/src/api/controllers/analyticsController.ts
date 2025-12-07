import type { Request, Response } from "express";
import { prisma } from "../../data/prisma/prismaClient";
import { IssueStatus } from "../../generated/prisma/enums";
import { Parser } from "json2csv";

interface TrendDataPoint {
    date: string;
    reported: number;
    resolved: number;
}

function getDateRangeFilter(timeRange: string): Date {
    const now = new Date();
    switch (timeRange) {
        case "7d":
            return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case "30d":
            return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        case "90d":
            return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        default:
            return new Date(0);
    }
}

function fillDateGaps(data: Map<string, { reported: number; resolved: number }>, startDate: Date, endDate: Date): TrendDataPoint[] {
    const result: TrendDataPoint[] = [];
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);

    while (current <= endDate) {
        const dateStr = current.toISOString().split("T")[0] || "";
        const existing = data.get(dateStr) || { reported: 0, resolved: 0 };
        result.push({
            date: dateStr || "",
            reported: existing.reported,
            resolved: existing.resolved,
        });
        current.setDate(current.getDate() + 1);
    }

    return result;
}

export async function getSummary(req: Request, res: Response) {
    try {
        const timeRange = (req.query.timeRange as string) || "30d";
        const startDate = getDateRangeFilter(timeRange);
        const userId = req.user?.id;
        const isGuest = !userId || req.user?.role === "GUEST";

        let personalImpact = null;

        if (!isGuest && userId) {
            const userIssues = await prisma.issue.findMany({
                where: { userId, createdAt: { gte: startDate } },
                select: { status: true },
            });

            const issuesReported = userIssues.length;
            const issuesResolved = userIssues.filter((i) => i.status === IssueStatus.RESOLVED).length;

            personalImpact = {
                issuesReported,
                issuesResolved,
                resolutionRate: issuesReported > 0 ? Math.round((issuesResolved / issuesReported) * 100) : 0,
            };
        }

        const activeIssues = await prisma.issue.count({
            where: {
                status: { not: IssueStatus.RESOLVED },
                createdAt: { gte: startDate },
            },
        });
        console.log(`[Analytics] TimeRange: ${timeRange}, StartDate: ${startDate.toISOString()}`);
        console.log(`[Analytics] Active Issues Found: ${activeIssues}`);

        const resolvedIssues = await prisma.issue.findMany({
            where: {
                status: IssueStatus.RESOLVED,
                createdAt: { gte: startDate },
            },
            select: { createdAt: true, updatedAt: true },
        });

        let avgResolutionTimeHours = 0;
        if (resolvedIssues.length > 0) {
            const totalHours = resolvedIssues.reduce((sum, issue) => {
                const diff = issue.updatedAt.getTime() - issue.createdAt.getTime();
                return sum + diff / (1000 * 60 * 60);
            }, 0);
            avgResolutionTimeHours = Math.round(totalHours / resolvedIssues.length);
        }

        const issuesWithNegativeVotes = await prisma.issue.count({
            where: {
                status: IssueStatus.IN_PROGRESS,
                createdAt: { gte: startDate },
                resolutionVotes: {
                    some: { isResolved: false },
                },
            },
        });

        const totalResolved = resolvedIssues.length + issuesWithNegativeVotes;
        const reopenRate = totalResolved > 0 ? Math.round((issuesWithNegativeVotes / totalResolved) * 100) : 0;

        const allIssues = await prisma.issue.findMany({
            where: { createdAt: { gte: startDate } },
            select: { createdAt: true, status: true },
        });

        const trendMap = new Map<string, { reported: number; resolved: number }>();

        for (const issue of allIssues) {
            const dateStr = issue.createdAt.toISOString().split("T")[0] || "";
            const existing = trendMap.get(dateStr) || { reported: 0, resolved: 0 };
            existing.reported++;
            if (issue.status === IssueStatus.RESOLVED) {
                existing.resolved++;
            }
            trendMap.set(dateStr || "", existing);
        }

        const trend = fillDateGaps(trendMap, startDate, new Date());

        return res.json({
            personalImpact,
            communityHealth: {
                avgResolutionTimeHours,
                reopenRate,
                totalActiveIssues: activeIssues,
            },
            trend,
        });
    } catch (err) {
        console.error("Error getting analytics summary:", err);
        return res.status(500).json({ error: "Failed to get analytics" });
    }
}

export async function getHeatmap(req: Request, res: Response) {
    try {
        const minLat = parseFloat(req.query.minLat as string);
        const maxLat = parseFloat(req.query.maxLat as string);
        const minLng = parseFloat(req.query.minLng as string);
        const maxLng = parseFloat(req.query.maxLng as string);

        if ([minLat, maxLat, minLng, maxLng].some(isNaN)) {
            return res.status(400).json({ error: "Invalid bounds parameters" });
        }

        const issues = await prisma.issue.findMany({
            where: {
                latitude: { gte: minLat, lte: maxLat },
                longitude: { gte: minLng, lte: maxLng },
                status: { not: IssueStatus.RESOLVED },
            },
            select: {
                latitude: true,
                longitude: true,
                severity: true,
                createdAt: true,
                _count: { select: { upvotes: true, comments: true } },
            },
        });

        const heatmapData = issues.map((issue) => {
            const hoursSinceCreation = (Date.now() - issue.createdAt.getTime()) / (1000 * 60 * 60);
            const urgencyScore = Math.min(100, hoursSinceCreation * 0.5 + issue._count.upvotes * 2 + issue._count.comments);
            const severity = issue.severity || 3;
            const weight = severity * 0.3 + (urgencyScore / 100) * 0.7;

            return {
                lat: issue.latitude,
                lng: issue.longitude,
                weight: Math.min(1, weight),
            };
        });

        return res.json(heatmapData);
    } catch (err) {
        console.error("Error getting heatmap data:", err);
        return res.status(500).json({ error: "Failed to get heatmap data" });
    }
}

export async function exportData(req: Request, res: Response) {
    try {
        const format = (req.query.format as string) || "csv";
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const issues = await prisma.issue.findMany({
            where: { userId },
            select: {
                id: true,
                title: true,
                description: true,
                issueType: true,
                status: true,
                latitude: true,
                longitude: true,
                createdAt: true,
                updatedAt: true,
                severity: true,
            },
            orderBy: { createdAt: "desc" },
        });

        const exportData = issues.map((issue) => ({
            id: issue.id,
            title: issue.title,
            description: issue.description,
            type: issue.issueType,
            status: issue.status,
            latitude: issue.latitude,
            longitude: issue.longitude,
            severity: issue.severity || "N/A",
            reportedAt: issue.createdAt.toISOString(),
            lastUpdated: issue.updatedAt.toISOString(),
        }));

        if (format === "json") {
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Content-Disposition", "attachment; filename=my-civic-report.json");
            return res.json(exportData);
        }

        const parser = new Parser({
            fields: ["id", "title", "description", "type", "status", "latitude", "longitude", "severity", "reportedAt", "lastUpdated"],
        });
        const csv = parser.parse(exportData);

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=my-civic-report.csv");
        return res.send(csv);
    } catch (err) {
        console.error("Error exporting data:", err);
        return res.status(500).json({ error: "Failed to export data" });
    }
}

export default { getSummary, getHeatmap, exportData };
