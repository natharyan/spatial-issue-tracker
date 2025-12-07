-- CreateTable
CREATE TABLE "GraphNode" (
    "id" TEXT NOT NULL,
    "osmId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "GraphNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GraphEdge" (
    "id" TEXT NOT NULL,
    "startNodeId" TEXT NOT NULL,
    "endNodeId" TEXT NOT NULL,
    "distance" DOUBLE PRECISION NOT NULL,
    "baseCost" DOUBLE PRECISION NOT NULL,
    "penalty" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "GraphEdge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GraphNode_osmId_key" ON "GraphNode"("osmId");

-- CreateIndex
CREATE INDEX "GraphNode_latitude_longitude_idx" ON "GraphNode"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "GraphEdge_startNodeId_idx" ON "GraphEdge"("startNodeId");

-- CreateIndex
CREATE INDEX "GraphEdge_endNodeId_idx" ON "GraphEdge"("endNodeId");

-- AddForeignKey
ALTER TABLE "GraphEdge" ADD CONSTRAINT "GraphEdge_startNodeId_fkey" FOREIGN KEY ("startNodeId") REFERENCES "GraphNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraphEdge" ADD CONSTRAINT "GraphEdge_endNodeId_fkey" FOREIGN KEY ("endNodeId") REFERENCES "GraphNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
