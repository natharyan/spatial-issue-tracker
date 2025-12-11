/**
 * Penalty Service
 * Maps reported issues to nearby road edges and updates their penalties.
 */

import { prisma } from "../data/prisma/prismaClient";
import { IssueType, IssueStatus } from "../generated/prisma/enums";

// Penalty multipliers based on issue type
const ISSUE_PENALTY_MAP: Partial<Record<IssueType, number>> = {
    POTHOLE: 1.5,
    ROAD_DAMAGE: 5.0,
    DRAINAGE_BLOCKED: 3.0,
    SEWAGE_OVERFLOW: 4.0,
    OPEN_MANHOLE: 8.0,
    TREE_FALL: 10.0,
    TRAFFIC_LIGHT_FAULT: 2.0,
    BROKEN_FOOTPATH: 1.2,
};

// Search radius for finding nearby nodes (in degrees, ~20m ≈ 0.0002)
const SEARCH_RADIUS = 0.0002;

/**
 * Recalculates penalties for all edges based on active issues.
 * Uses nodes-first approach for performance:
 * 1. Find nodes near each issue
 * 2. Update edges connected to those nodes
 */
export async function recalculatePenalties(): Promise<void> {
    console.log("Recalculating edge penalties...");

    // Reset all penalties to 1.0
    await prisma.graphEdge.updateMany({
        data: { penalty: 1.0 },
    });

    // Get all active (non-resolved) issues using PostGIS
    const activeIssues = await prisma.$queryRaw<Array<{
        id: number;
        latitude: number;
        longitude: number;
        issueType: string;
        severity: number;
    }>>`
        SELECT 
            id,
            ST_Y(location) as latitude,
            ST_X(location) as longitude,
            "issueType", severity
        FROM "Issue" 
        WHERE status != 'RESOLVED'::"IssueStatus"
        AND location IS NOT NULL
    `;

    console.log(`Found ${activeIssues.length} active issues`);

    for (const issue of activeIssues) {
        const basePenalty = ISSUE_PENALTY_MAP[issue.issueType as IssueType] || 1.0;
        const severityMultiplier = issue.severity ? issue.severity / 3 : 1.0;
        const penalty = basePenalty * severityMultiplier;
        if (penalty <= 1.0) continue;

        // Use PostGIS to find nearby nodes within search radius
        const nearbyNodes = await prisma.$queryRaw<Array<{ id: string }>>`
            SELECT gn.id
            FROM "GraphNode" gn
            WHERE ST_DWithin(
                ST_SetSRID(ST_MakePoint(gn.longitude, gn.latitude), 4326)::geography,
                ST_SetSRID(ST_MakePoint(${issue.longitude}, ${issue.latitude}), 4326)::geography,
                ${SEARCH_RADIUS * 111000} -- Convert degrees to meters (approx)
            )
        `;

        if (nearbyNodes.length === 0) continue;

        const nodeIds = nearbyNodes.map((n) => n.id);

        // Update edges connected to these nodes
        await prisma.graphEdge.updateMany({
            where: {
                OR: [{ startNodeId: { in: nodeIds } }, { endNodeId: { in: nodeIds } }],
                penalty: { lt: penalty },
            },
            data: { penalty },
        });

        console.log(`  Issue #${issue.id} (${issue.issueType}): Applied penalty ${penalty} to ${nearbyNodes.length} nearby nodes`);
    }

    console.log("Penalty recalculation complete");
}

export default { recalculatePenalties };
