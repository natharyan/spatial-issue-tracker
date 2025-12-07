/**
 * Script to simulate user interactions: Upvotes, Comments, Comment Upvotes
 * Biased towards "rich-get-richer" (popular content gets more interactions)
 * Also awards points to test Badge system.
 * 
 * Run with: npx tsx scripts/createTestInteractions.ts
 */

import 'dotenv/config';
import { prisma } from '../src/data/prisma/prismaClient';
import {
    addIssueUpvote,
    addComment,
    addCommentUpvote,
    getCommentsForIssue,
    hasUserUpvotedIssue
} from '../src/data/issue';
import { awardPoints } from '../src/services/GamificationService';

const INTERACTION_COUNT = 500;

// Content for random comments
const COMMENT_TEMPLATES = [
    "This is really dangerous, please fix soon!",
    "I saw this yesterday too.",
    "Has anyone reported this to the local corporator?",
    "Upvoted for visibility.",
    "This has been here for months.",
    "Great initiative to report this.",
    "Status says pending but I saw workers there today.",
    "Can we get an update on this?",
    "This is blocking traffic badly.",
    "I tripped over this last week.",
    "Is this under PWD jurisdiction?",
    "Please prioritize this.",
    "Same situation in my colony.",
    "Thanks for reporting.",
    "Marking as urgent."
];

async function main() {
    console.log('Starting interaction simulation...');

    // 1. Fetch Users
    const users = await prisma.user.findMany({
        where: { email: { endsWith: '@gmail.com' } },
        take: 100
    });

    if (users.length === 0) {
        console.error('No test users found. Run createTestUsers.ts first.');
        return;
    }
    console.log(`Loaded ${users.length} users.`);

    // 2. Fetch Issues with stats for weighted selection
    let issues = await prisma.issue.findMany({
        select: {
            id: true,
            userId: true,
            _count: { select: { upvotes: true, comments: true } }
        }
    });

    if (issues.length === 0) {
        console.error('No issues found. Run createTestIssues.ts first.');
        return;
    }
    console.log(`Loaded ${issues.length} issues.`);

    // Helper: Select Issue Weighted
    const selectWeightedIssue = () => {
        const totalWeight = issues.reduce((sum, issue) => sum + (issue._count.upvotes + issue._count.comments + 1), 0);
        let r = Math.random() * totalWeight;
        for (const issue of issues) {
            const weight = issue._count.upvotes + issue._count.comments + 1;
            if (r < weight) return issue;
            r -= weight;
        }
        return issues[0];
    };

    let interactions = 0;
    console.log(`Starting loop for ${INTERACTION_COUNT} interactions...`);

    for (let i = 0; i < INTERACTION_COUNT; i++) {
        const issue = selectWeightedIssue();
        if (!issue) {
            console.error('Failed to select issue');
            continue;
        }

        const user = users[Math.floor(Math.random() * users.length)];
        if (!user) {
            console.error('Failed to select user');
            continue;
        }

        // Prevent acting on own issue (optional, but realistic)
        if (issue.userId === user.id) continue;

        const rand = Math.random();

        try {
            if (rand < 0.8) {
                // 80% - Upvote Issue
                const hasVoted = await hasUserUpvotedIssue(user.id, issue.id);
                if (!hasVoted) {
                    await addIssueUpvote(user.id, issue.id);
                    // Award points to Author
                    await awardPoints(issue.userId, 1);
                    // Award points to Voter? Script decision: Yes, for badge test
                    await awardPoints(user.id, 1);

                    // Update local count for weighting
                    issue._count.upvotes++;
                    interactions++;
                }
            } else if (rand < 0.95) {
                // 15% - Comment
                const template = COMMENT_TEMPLATES[Math.floor(Math.random() * COMMENT_TEMPLATES.length)];
                if (!template) continue;

                await addComment(user.id, issue.id, template);

                // Award points
                await awardPoints(user.id, 2); // Commenter
                await awardPoints(issue.userId, 2); // Author engagement

                issue._count.comments++;
                interactions++;
            } else {
                // 5% - Upvote Comment
                const comments = await getCommentsForIssue(issue.id);
                if (comments.length > 0) {
                    const comment = comments[Math.floor(Math.random() * comments.length)];
                    if (comment && comment.userId !== user.id) { // Don't upvote own
                        const existing = comment.upvotes.find(u => u.userId === user.id);
                        if (!existing) {
                            await addCommentUpvote(user.id, comment.id);
                            await awardPoints(comment.userId, 5); // Match controller logic
                            interactions++;
                        }
                    }
                }
            }

        } catch (err) {
            console.error(`Error in interaction ${i}:`, err);
        }

        if (interactions % 5 === 0 && interactions > 0) {
            console.log(`Interactions: ${interactions}/${INTERACTION_COUNT}`);
        }
    }

    console.log(`\nCompleted ${interactions} interactions.`);

    // Clear cache so map updates
    console.log('Clearing issue cache...');
    const { clearAllIssueCache } = await import('../src/services/IssueCacheService');
    await clearAllIssueCache();
    console.log('Issue cache cleared.');
}

main()
    .then(() => process.exit(0))
    .catch(e => {
        console.error('Fatal error in main:', e);
        process.exit(1);
    });
