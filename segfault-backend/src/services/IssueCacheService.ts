/**
 * Issue Cache Service
 * Caches issue summaries by geo-grid cells for fast map loading
 * Full issue details are loaded on-demand from DB
 */

import { redisClient } from '../data/redisClient';
import { prisma } from '../data/prisma/prismaClient';
import { IssueStatus } from '../generated/prisma/enums';

// Cache TTL in seconds
const CACHE_TTL = 300; // 5 minutes for issue grid cells
const ISSUE_SUMMARY_TTL = 600; // 10 minutes for individual issue summaries

// Grid cell size in degrees (roughly 1km at equator)
const GRID_CELL_SIZE = 0.01;

// Lightweight issue summary for map display
export interface IssueSummary {
    id: number;
    title: string;
    status: string;
    issueType: string;
    latitude: number;
    longitude: number;
    voteCount: number;
    commentCount: number;
    createdAt: string;
}

// Convert lat/lng to grid cell key
function getGridCellKey(lat: number, lng: number): string {
    const cellLat = Math.floor(lat / GRID_CELL_SIZE);
    const cellLng = Math.floor(lng / GRID_CELL_SIZE);
    return `issues:grid:${cellLat}:${cellLng}`;
}

// Get all grid cells for a bounding box
function getGridCellsForBounds(
    minLat: number,
    maxLat: number,
    minLng: number,
    maxLng: number
): string[] {
    const cells: string[] = [];
    const startLat = Math.floor(minLat / GRID_CELL_SIZE);
    const endLat = Math.floor(maxLat / GRID_CELL_SIZE);
    const startLng = Math.floor(minLng / GRID_CELL_SIZE);
    const endLng = Math.floor(maxLng / GRID_CELL_SIZE);

    for (let lat = startLat; lat <= endLat; lat++) {
        for (let lng = startLng; lng <= endLng; lng++) {
            cells.push(`issues:grid:${lat}:${lng}`);
        }
    }
    return cells;
}

// Cache a single issue summary
async function cacheIssueSummary(issue: IssueSummary): Promise<void> {
    const key = `issue:summary:${issue.id}`;
    await redisClient.setex(key, ISSUE_SUMMARY_TTL, JSON.stringify(issue));
}

// Get cached issue summary
async function getCachedIssueSummary(issueId: number): Promise<IssueSummary | null> {
    const cached = await redisClient.get(`issue:summary:${issueId}`);
    if (cached) {
        return JSON.parse(cached);
    }
    return null;
}

// Cache issues for a grid cell
async function cacheGridCell(cellKey: string, issueIds: number[]): Promise<void> {
    await redisClient.setex(cellKey, CACHE_TTL, JSON.stringify(issueIds));
}

// Get cached grid cell
async function getCachedGridCell(cellKey: string): Promise<number[] | null> {
    const cached = await redisClient.get(cellKey);
    if (cached) {
        return JSON.parse(cached);
    }
    return null;
}

// Fetch issues for a bounding box with caching
export async function getIssuesInBounds(
    minLat: number,
    maxLat: number,
    minLng: number,
    maxLng: number,
    includeResolved = false
): Promise<IssueSummary[]> {
    const cells = getGridCellsForBounds(minLat, maxLat, minLng, maxLng);

    // Limit grid cells to prevent massive queries
    if (cells.length > 100) {
        // Too many cells, query DB directly without caching
        return fetchIssuesFromDb(minLat, maxLat, minLng, maxLng, includeResolved);
    }

    const allIssueIds = new Set<number>();
    const uncachedCells: string[] = [];

    // Check which cells are cached
    for (const cell of cells) {
        const cachedIds = await getCachedGridCell(cell);
        if (cachedIds) {
            cachedIds.forEach(id => allIssueIds.add(id));
        } else {
            uncachedCells.push(cell);
        }
    }

    // Fetch uncached cells from DB and cache them
    if (uncachedCells.length > 0) {
        for (const cellKey of uncachedCells) {
            const parts = cellKey.split(':');
            const latStr = parts[2];
            const lngStr = parts[3];
            if (!latStr || !lngStr) continue;
            const cellLat = parseInt(latStr) * GRID_CELL_SIZE;
            const cellLng = parseInt(lngStr) * GRID_CELL_SIZE;

            // Use PostGIS query instead of Prisma since latitude/longitude fields no longer exist
            const cellIssues = await prisma.$queryRaw<Array<{
                id: number;
                title: string;
                status: string;
                issueType: string;
                latitude: number;
                longitude: number;
                createdAt: Date;
                upvote_count: number;
                comment_count: number;
            }>>`
                SELECT 
                    i.id, i.title, i.status, i."issueType",
                    ST_Y(i.location) as latitude,
                    ST_X(i.location) as longitude,
                    i."createdAt",
                    COALESCE(upvote_count, 0) as upvote_count,
                    COALESCE(comment_count, 0) as comment_count
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
                WHERE ST_Within(
                    i.location,
                    ST_MakeEnvelope(${cellLng}, ${cellLat}, ${cellLng + GRID_CELL_SIZE}, ${cellLat + GRID_CELL_SIZE}, 4326)
                )
                ${includeResolved ? '' : `AND i.status != 'RESOLVED'::"IssueStatus"`}
            `;

            const issueIds = cellIssues.map(i => i.id);
            await cacheGridCell(cellKey, issueIds);

            // Cache individual issue summaries
            for (const issue of cellIssues) {
                const summary: IssueSummary = {
                    id: issue.id,
                    title: issue.title,
                    status: issue.status,
                    issueType: issue.issueType,
                    latitude: issue.latitude,
                    longitude: issue.longitude,
                    voteCount: issue.upvote_count,
                    commentCount: issue.comment_count,
                    createdAt: issue.createdAt.toISOString(),
                };
                await cacheIssueSummary(summary);
                allIssueIds.add(issue.id);
            }
        }
    }

    // Fetch all issue summaries (from cache or DB)
    const results: IssueSummary[] = [];
    for (const id of allIssueIds) {
        let summary = await getCachedIssueSummary(id);
        if (!summary) {
            // Use PostGIS query instead of Prisma
            const issues = await prisma.$queryRaw<Array<{
                id: number;
                title: string;
                status: string;
                issueType: string;
                latitude: number;
                longitude: number;
                createdAt: Date;
                upvote_count: number;
                comment_count: number;
            }>>`
                SELECT 
                    i.id, i.title, i.status, i."issueType",
                    ST_Y(i.location) as latitude,
                    ST_X(i.location) as longitude,
                    i."createdAt",
                    COALESCE(upvote_count, 0) as upvote_count,
                    COALESCE(comment_count, 0) as comment_count
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
                WHERE i.id = ${id}
            `;
            
            const issue = issues[0];
            if (issue) {
                summary = {
                    id: issue.id,
                    title: issue.title,
                    status: issue.status,
                    issueType: issue.issueType,
                    latitude: issue.latitude,
                    longitude: issue.longitude,
                    voteCount: issue.upvote_count,
                    commentCount: issue.comment_count,
                    createdAt: issue.createdAt.toISOString(),
                };
                await cacheIssueSummary(summary);
            }
        }
        if (summary) {
            // filter by resolved status
            if (!includeResolved && summary.status === 'RESOLVED') continue;
            // filter by actual bounds (grid cells may include nearby issues)
            if (
                summary.latitude >= minLat &&
                summary.latitude <= maxLat &&
                summary.longitude >= minLng &&
                summary.longitude <= maxLng
            ) {
                results.push(summary);
            }
        }
    }

    return results;
}

// Direct DB fetch (fallback for large areas) for PostGIS
async function fetchIssuesFromDb(
    minLat: number,
    maxLat: number,
    minLng: number,
    maxLng: number,
    includeResolved: boolean
): Promise<IssueSummary[]> {
    const statusFilter = includeResolved ? '' : `AND status != 'RESOLVED'::"IssueStatus"`;
    
    const issues = await prisma.$queryRaw<Array<{
        id: number;
        title: string;
        status: string;
        issueType: string;
        latitude: number;
        longitude: number;
        createdAt: Date;
        upvote_count: number;
        comment_count: number;
    }>>`
        SELECT 
            i.id, i.title, i.status, i."issueType",
            ST_Y(i.location) as latitude,
            ST_X(i.location) as longitude,
            i."createdAt",
            COALESCE(upvote_count, 0) as upvote_count,
            COALESCE(comment_count, 0) as comment_count
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
        WHERE ST_Within(
            i.location,
            ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326)
        )
        ${statusFilter}
        ORDER BY i."createdAt" DESC
        LIMIT 500
    `;

    return issues.map(issue => ({
        id: issue.id,
        title: issue.title,
        status: issue.status,
        issueType: issue.issueType,
        latitude: issue.latitude,
        longitude: issue.longitude,
        voteCount: issue.upvote_count,
        commentCount: issue.comment_count,
        createdAt: issue.createdAt.toISOString(),
    }));
}

// Invalidate cache for an issue (call after updates)
export async function invalidateIssueCache(issueId: number, lat?: number, lng?: number): Promise<void> {
    await redisClient.del(`issue:summary:${issueId}`);

    if (lat !== undefined && lng !== undefined) {
        const cellKey = getGridCellKey(lat, lng);
        await redisClient.del(cellKey);
    }
}

// Clear all issue cache
export async function clearAllIssueCache(): Promise<void> {
    const keys = await redisClient.keys('issues:grid:*');
    const summaryKeys = await redisClient.keys('issue:summary:*');
    if (keys.length > 0) await redisClient.del(...keys);
    if (summaryKeys.length > 0) await redisClient.del(...summaryKeys);
}

export default {
    getIssuesInBounds,
    invalidateIssueCache,
    clearAllIssueCache,
};
