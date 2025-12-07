import { QueueClient } from "@azure/storage-queue";

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || "";
const queueName = "issue-moderation";

let queueClient: QueueClient | null = null;

function getQueueClient(): QueueClient | null {
    if (!connectionString) {
        console.warn("Azure Storage connection string not configured. Queue disabled.");
        return null;
    }

    if (!queueClient) {
        queueClient = new QueueClient(connectionString, queueName);
    }
    return queueClient;
}

interface ModerationTask {
    issueId: number;
    blobUrl: string;
    latitude: number;
    longitude: number;
    issueType: string;
}

export async function sendToModerationQueue(task: ModerationTask): Promise<boolean> {
    const client = getQueueClient();
    if (!client) {
        console.log("Moderation queue not available, skipping...");
        return false;
    }

    try {
        const message = Buffer.from(JSON.stringify(task)).toString("base64");
        await client.sendMessage(message);
        console.log(`Sent issue ${task.issueId} to moderation queue`);
        return true;
    } catch (error) {
        console.error("Failed to send to moderation queue:", error);
        return false;
    }
}

export default { sendToModerationQueue };
