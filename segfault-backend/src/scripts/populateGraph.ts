import { ingestOSMData } from "../services/PathfindingService";
import { prisma } from "../data/prisma/prismaClient";

async function main() {
    console.log("Starting OSM Ingestion...");

    // Bounding Box for Central/South Delhi (approx)
    // MinLat, MinLng, MaxLat, MaxLng
    // 28.5355, 77.1855, 28.5600, 77.2200 (IIT Delhi Area roughly)
    const bbox: [number, number, number, number] = [28.5355, 77.1855, 28.5600, 77.2200];

    // Or just a small test area
    // const bbox: [number, number, number, number] = [28.6139, 77.2090, 28.6200, 77.2150]; // Near India Gate partial

    try {
        await ingestOSMData(bbox);
        console.log("Done!");
    } catch (e) {
        console.error("Failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
