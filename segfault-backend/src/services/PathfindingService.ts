/**
 * Pathfinding Service
 * Implements A* algorithm for finding optimal routes through the road network,
 * considering edge penalties from reported issues.
 */

import TinyQueue from "tinyqueue";
import * as turf from "@turf/turf";
import axios from "axios";
import { prisma } from "../data/prisma/prismaClient";
import { IssueStatus } from "../generated/prisma/enums";

interface PathNode {
    id: string;
    latitude: number;
    longitude: number;
}

interface PathEdge {
    id: string;
    startNodeId: string;
    endNodeId: string;
    distance: number;
    baseCost: number;
    penalty: number;
}

interface QueueItem {
    nodeId: string;
    fScore: number;
}

interface PathResult {
    path: Array<{ lat: number; lng: number }>;
    totalDistance: number;
    totalCost: number;
    estimatedTime: number; // in minutes, assuming average 30 km/h
}

/**
 * Calculates Euclidean distance between two points (heuristic for A*)
 */
function heuristic(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const from = turf.point([lon1, lat1]);
    const to = turf.point([lon2, lat2]);
    return turf.distance(from, to, { units: "meters" });
}

/**
 * Get bounding box for start/end points with buffer
 */
function getBoundingBox(startLat: number, startLng: number, endLat: number, endLng: number, bufferKM: number): [number, number, number, number] {
    const bufferDegrees = bufferKM / 111; // Approximate degrees per km
    const minLat = Math.min(startLat, endLat) - bufferDegrees;
    const maxLat = Math.max(startLat, endLat) + bufferDegrees;
    const minLng = Math.min(startLng, endLng) - bufferDegrees;
    const maxLng = Math.max(startLng, endLng) + bufferDegrees;
    return [minLat, minLng, maxLat, maxLng];
}

/**
 * Finds the nearest GraphNode to given coordinates within a bbox
 */
async function findNearestNodeInBbox(lat: number, lng: number, bbox: [number, number, number, number]): Promise<PathNode | null> {
    const nodes = await prisma.graphNode.findMany({
        where: {
            latitude: { gte: bbox[0], lte: bbox[2] },
            longitude: { gte: bbox[1], lte: bbox[3] },
        },
        select: { id: true, latitude: true, longitude: true },
    });

    if (nodes.length === 0) return null;

    let closest: PathNode | null = null;
    let minDist = Infinity;

    for (const node of nodes) {
        const dist = heuristic(lat, lng, node.latitude, node.longitude);
        if (dist < minDist) {
            minDist = dist;
            closest = node;
        }
    }

    return closest;
}

/**
 * Build adjacency list from edges
 */
/**
 * Build adjacency list from edges
 */
function buildAdjacencyList(
    edges: PathEdge[],
    activeIssues: Array<{ lat: number; lng: number; severity: number }> = []
): Map<string, Array<{ nodeId: string; cost: number; distance: number; edgeId: string }>> {
    const adj = new Map<string, Array<{ nodeId: string; cost: number; distance: number; edgeId: string }>>();

    for (const edge of edges) {
        if (!adj.has(edge.startNodeId)) {
            adj.set(edge.startNodeId, []);
        }

        // Base penalty from DB
        let penalty = edge.penalty === 0 ? 1 : edge.penalty;

        // Dynamic Issue Penalty
        // Check if any active issue is close to this edge
        // Simplified: Check if issue is near the start node
        // In a real system, we'd use spatial index or check distance to line segment
        const edgeStartNode = edges.find(e => e.id === edge.id); // This is inefficient if we look up, but we have startNodeId
        // Optimization: We pass nodes or assume logic.
        // Actually, we can check issues against the start node of the edge
        // Since we don't have node coords here easily without looking up, we might do this calculation locally in findPath or pass nodeMap here.
        // Better: Calculate 'risk zones' into a Set or fast lookup before calling this.

        // traffic Simulation
        const trafficFactor = 1.0;

        adj.get(edge.startNodeId)!.push({
            nodeId: edge.endNodeId,
            cost: edge.distance * penalty * trafficFactor,
            distance: edge.distance,
            edgeId: edge.id,
        });
    }

    return adj;
}

/**
 * Ingest OSM Data for a Bounding Box
 * bbox format: [minLat, minLng, maxLat, maxLng]
 */
export async function ingestOSMData(bbox: [number, number, number, number]) {
    const [minLat, minLng, maxLat, maxLng] = bbox;
    console.log(`Ingesting OSM data for bbox: ${bbox}`);

    // Overpass API Query
    // [out:json];(way[highway]({s},{w},{n},{e});>;);out body;
    const query = `
        [out:json][timeout:25];
        (
          way["highway"](${minLat},${minLng},${maxLat},${maxLng});
        );
        out body;
        >;
        out skel qt;
    `;

    try {
        const response = await axios.post("https://overpass-api.de/api/interpreter", `data=${encodeURIComponent(query)}`, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        const elements = response.data.elements;
        if (!elements) throw new Error("No elements found in Overpass response");

        console.log(`Fetched ${elements.length} elements from OSM`);

        const nodes = new Map<number, { lat: number; lon: number }>();
        const ways: any[] = [];

        // Parse elements
        for (const el of elements) {
            if (el.type === "node") {
                nodes.set(el.id, { lat: el.lat, lon: el.lon });
            } else if (el.type === "way") {
                ways.push(el);
            }
        }

        console.log(`Parsed ${nodes.size} nodes and ${ways.length} ways`);

        // Transaction to save to DB
        // We will process ways and create edges
        // Note: This can be slow for large datasets. For production, use bulk insert or stream.

        let newNodesCount = 0;
        let newEdgesCount = 0;

        for (const way of ways) {
            const wayNodes = way.nodes as number[];
            if (wayNodes.length < 2) continue;

            // Determine base penalty based on highway type
            let basePenalty = 1.0;
            const hw = way.tags?.highway;
            if (hw === 'motorway' || hw === 'trunk') basePenalty = 0.8; // Fast
            else if (hw === 'primary') basePenalty = 0.9;
            else if (hw === 'residential') basePenalty = 1.2; // Slower
            else if (hw === 'service' || hw === 'track') basePenalty = 1.5;

            for (let i = 0; i < wayNodes.length - 1; i++) {
                const startId = wayNodes[i] as number;
                const endId = wayNodes[i + 1] as number;

                const startNode = nodes.get(startId);
                const endNode = nodes.get(endId);

                if (startNode && endNode) {
                    // Upsert nodes using raw SQL to handle location
                    const n1Id = await prisma.$queryRaw<Array<{ id: string }>>`
                        INSERT INTO "GraphNode" ("osmId", "latitude", "longitude", "location")
                        VALUES (${startId.toString()}, ${startNode.lat}, ${startNode.lon}, ST_SetSRID(ST_MakePoint(${startNode.lon}, ${startNode.lat}), 4326))
                        ON CONFLICT ("osmId") DO NOTHING
                        RETURNING "id"
                    `;
                    const existingN1 = await prisma.graphNode.findUnique({ where: { osmId: startId.toString() } });
                    if (!existingN1) throw new Error(`Node ${startId} not found`);
                    const n1 = n1Id.length > 0 && n1Id[0] ? n1Id[0].id : existingN1.id;

                    const n2Id = await prisma.$queryRaw<Array<{ id: string }>>`
                        INSERT INTO "GraphNode" ("osmId", "latitude", "longitude", "location")
                        VALUES (${endId.toString()}, ${endNode.lat}, ${endNode.lon}, ST_SetSRID(ST_MakePoint(${endNode.lon}, ${endNode.lat}), 4326))
                        ON CONFLICT ("osmId") DO NOTHING
                        RETURNING "id"
                    `;
                    const existingN2 = await prisma.graphNode.findUnique({ where: { osmId: endId.toString() } });
                    if (!existingN2) throw new Error(`Node ${endId} not found`);
                    const n2 = n2Id.length > 0 && n2Id[0] ? n2Id[0].id : existingN2.id;

                    if (n1 && n2) {
                        // Distance
                        const dist = turf.distance(
                            turf.point([startNode.lon, startNode.lat]),
                            turf.point([endNode.lon, endNode.lat]),
                            { units: 'meters' }
                        );

                        // Create Edge (One way unless specified? OSM ways are generally one way if oneway=yes, but assuming bidirectional for simplicity for now or creating two edges)
                        // Simplified: Create bidirectional for all for this prototype unless oneway tag is explicit

                        const createEdge = async (fromId: string, toId: string) => {
                            await prisma.graphEdge.create({
                                data: {
                                    startNodeId: fromId,
                                    endNodeId: toId,
                                    distance: dist,
                                    baseCost: dist,
                                    penalty: basePenalty
                                }
                            });
                            newEdgesCount++;
                        };

                        await createEdge(n1, n2);
                        // Verify oneway
                        if (way.tags?.oneway !== 'yes') {
                            await createEdge(n2, n1);
                        }
                    }
                }
            }
        }
        console.log(`Ingestion complete. Added edges.`);
        return { success: true, nodes: nodes.size, ways: ways.length };

    } catch (error) {
        console.error("OSM Ingestion Error:", error);
        throw error;
    }
}

/**
 * A* pathfinding algorithm
 */
export async function findPath(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
): Promise<PathResult | null> {
    console.log(`Finding path from (${startLat}, ${startLng}) to (${endLat}, ${endLng})`);

    // Step 1: Compute bounding box with 2km buffer
    const bbox = getBoundingBox(startLat, startLng, endLat, endLng, 2);

    // Step 2: Check if enough nodes exist in bbox
    const nodeCount = await prisma.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*) as count FROM "GraphNode"
        WHERE ST_Within(location, ST_MakeEnvelope(${bbox[1]}, ${bbox[0]}, ${bbox[3]}, ${bbox[2]}, 4326))
    `;
    const count = nodeCount.length > 0 && nodeCount[0] ? Number(nodeCount[0].count) : 0;

    if (count < 50) {
        console.log(`Insufficient nodes (${count}), ingesting OSM data for bbox`);
        await ingestOSMData(bbox);
    }

    // Step 3: Snap to nearest nodes within bbox
    const startNode = await findNearestNodeInBbox(startLat, startLng, bbox);
    const endNode = await findNearestNodeInBbox(endLat, endLng, bbox);

    if (!startNode || !endNode) {
        console.log("Could not find start or end node in graph");
        return null;
    }

    console.log(`Start node: ${startNode.id}, End node: ${endNode.id}`);

    // Step 4: Fetch nodes and edges within bbox
    const [allNodes, allEdges, activeIssues] = await Promise.all([
        prisma.graphNode.findMany({
            where: {
                latitude: { gte: bbox[0], lte: bbox[2] },
                longitude: { gte: bbox[1], lte: bbox[3] },
            },
            select: { id: true, latitude: true, longitude: true },
        }),
        prisma.graphEdge.findMany({
            where: {
                startNode: {
                    latitude: { gte: bbox[0], lte: bbox[2] },
                    longitude: { gte: bbox[1], lte: bbox[3] },
                },
                endNode: {
                    latitude: { gte: bbox[0], lte: bbox[2] },
                    longitude: { gte: bbox[1], lte: bbox[3] },
                },
            },
            select: { id: true, startNodeId: true, endNodeId: true, distance: true, baseCost: true, penalty: true },
        }),
        // Use PostGIS to get issue locations
        prisma.$queryRaw<Array<{
            latitude: number;
            longitude: number;
            issueType: string;
            severity: number;
        }>>`
            SELECT 
                ST_Y(location) as latitude,
                ST_X(location) as longitude,
                "issueType", severity
            FROM "Issue" 
            WHERE status != 'RESOLVED'::"IssueStatus"
            AND location IS NOT NULL
        `
    ]);

    console.log(`Loaded ${allNodes.length} nodes, ${allEdges.length} edges, and ${activeIssues.length} active issues`);

    // Build node lookup
    const nodeMap = new Map<string, PathNode>();
    for (const node of allNodes) {
        nodeMap.set(node.id, node);
    }

    // Apply dynamic penalties to edges
    const issueRadius = 50; // 50 meters
    for (const issue of activeIssues) {
        const nearbyNodes = await prisma.$queryRaw<Array<{ id: string }>>`
            SELECT gn.id
            FROM "GraphNode" gn
            WHERE ST_DWithin(
                ST_SetSRID(ST_MakePoint(gn.longitude, gn.latitude), 4326)::geography,
                ST_SetSRID(ST_MakePoint(${issue.longitude}, ${issue.latitude}), 4326)::geography,
                ${issueRadius}
            )
        `;
        const nearbyNodeIds = new Set(nearbyNodes.map(n => n.id));
        for (const edge of allEdges) {
            if (nearbyNodeIds.has(edge.startNodeId) || nearbyNodeIds.has(edge.endNodeId)) {
                const severity = issue.severity || 1;
                const multiplier = 1 + (severity * 2);
                edge.penalty = (edge.penalty || 1) * multiplier;
            }
        }
    }

    // Build adjacency list
    const adjacency = buildAdjacencyList(allEdges);

    // Step 5: Bidirectional A*
    const startQueue = new TinyQueue<QueueItem>([{ nodeId: startNode.id, fScore: 0 }], (a: QueueItem, b: QueueItem) => a.fScore - b.fScore);
    const endQueue = new TinyQueue<QueueItem>([{ nodeId: endNode.id, fScore: 0 }], (a: QueueItem, b: QueueItem) => a.fScore - b.fScore);

    const gScoreStart = new Map<string, number>();
    const gScoreEnd = new Map<string, number>();
    const cameFromStart = new Map<string, string>();
    const cameFromEnd = new Map<string, string>();
    const distanceFromStart = new Map<string, number>();
    const distanceFromEnd = new Map<string, number>();

    gScoreStart.set(startNode.id, 0);
    gScoreEnd.set(endNode.id, 0);
    distanceFromStart.set(startNode.id, 0);
    distanceFromEnd.set(endNode.id, 0);

    const visitedStart = new Set<string>();
    const visitedEnd = new Set<string>();

    let meetingNode: string | null = null;

    while (startQueue.length > 0 && endQueue.length > 0) {
        // Expand the smaller queue
        const expandStart = startQueue.length <= endQueue.length;

        if (expandStart) {
            const current = startQueue.pop()!;
            if (visitedStart.has(current.nodeId)) continue;
            visitedStart.add(current.nodeId);

            if (visitedEnd.has(current.nodeId)) {
                meetingNode = current.nodeId;
                break;
            }

            const neighbors = adjacency.get(current.nodeId) || [];
            for (const neighbor of neighbors) {
                const currentG = gScoreStart.get(current.nodeId) ?? Infinity;
                const tentativeGScore = currentG + neighbor.cost;
                const tentativeDistance = (distanceFromStart.get(current.nodeId) ?? 0) + neighbor.distance;
                const neighborG = gScoreStart.get(neighbor.nodeId) ?? Infinity;

                if (tentativeGScore < neighborG) {
                    cameFromStart.set(neighbor.nodeId, current.nodeId);
                    gScoreStart.set(neighbor.nodeId, tentativeGScore);
                    distanceFromStart.set(neighbor.nodeId, tentativeDistance);

                    const neighborNode = nodeMap.get(neighbor.nodeId);
                    if (neighborNode) {
                        const h = heuristic(neighborNode.latitude, neighborNode.longitude, endNode.latitude, endNode.longitude);
                        startQueue.push({
                            nodeId: neighbor.nodeId,
                            fScore: tentativeGScore + h,
                        });
                    }
                }
            }
        } else {
            const current = endQueue.pop()!;
            if (visitedEnd.has(current.nodeId)) continue;
            visitedEnd.add(current.nodeId);

            if (visitedStart.has(current.nodeId)) {
                meetingNode = current.nodeId;
                break;
            }

            // Reverse adjacency for end search
            const reverseNeighbors: Array<{ nodeId: string; cost: number; distance: number }> = [];
            for (const [fromId, edges] of adjacency) {
                for (const edge of edges) {
                    if (edge.nodeId === current.nodeId) {
                        reverseNeighbors.push({ nodeId: fromId, cost: edge.cost, distance: edge.distance });
                    }
                }
            }

            for (const neighbor of reverseNeighbors) {
                const currentG = gScoreEnd.get(current.nodeId) ?? Infinity;
                const tentativeGScore = currentG + neighbor.cost;
                const tentativeDistance = (distanceFromEnd.get(current.nodeId) ?? 0) + neighbor.distance;
                const neighborG = gScoreEnd.get(neighbor.nodeId) ?? Infinity;

                if (tentativeGScore < neighborG) {
                    cameFromEnd.set(neighbor.nodeId, current.nodeId);
                    gScoreEnd.set(neighbor.nodeId, tentativeGScore);
                    distanceFromEnd.set(neighbor.nodeId, tentativeDistance);

                    const neighborNode = nodeMap.get(neighbor.nodeId);
                    if (neighborNode) {
                        const h = heuristic(neighborNode.latitude, neighborNode.longitude, startNode.latitude, startNode.longitude);
                        endQueue.push({
                            nodeId: neighbor.nodeId,
                            fScore: tentativeGScore + h,
                        });
                    }
                }
            }
        }
    }

    if (!meetingNode) {
        console.log(`No path found`);
        return null;
    }

    // Reconstruct path
    const path: Array<{ lat: number; lng: number }> = [];
    let nodeId: string | undefined = meetingNode;
    let totalDistance = 0;
    let totalCost = 0;

    // From start to meeting
    const startPath: string[] = [];
    while (nodeId) {
        startPath.unshift(nodeId);
        nodeId = cameFromStart.get(nodeId);
    }
    for (const id of startPath) {
        const node = nodeMap.get(id as string)!;
        path.push({ lat: node.latitude, lng: node.longitude });
    }

    // From meeting to end (reverse)
    const endPath: string[] = [];
    nodeId = meetingNode;
    while (nodeId) {
        endPath.push(nodeId);
        nodeId = cameFromEnd.get(nodeId);
    }
    for (let i = endPath.length - 2; i >= 0; i--) {
        const id = endPath[i];
        const node = nodeMap.get(id as string)!;
        path.push({ lat: node.latitude, lng: node.longitude });
    }

    totalDistance = (distanceFromStart.get(meetingNode) ?? 0) + (distanceFromEnd.get(meetingNode) ?? 0);
    totalCost = (gScoreStart.get(meetingNode) ?? 0) + (gScoreEnd.get(meetingNode) ?? 0);

    const estimatedTime = (totalDistance / 1000 / 30) * 60;

    console.log(`Path found! ${path.length} nodes, ${totalDistance.toFixed(0)}m, ${estimatedTime.toFixed(1)}min`);

    return {
        path,
        totalDistance,
        totalCost,
        estimatedTime,
    };
}

export default { findPath, ingestOSMData };
