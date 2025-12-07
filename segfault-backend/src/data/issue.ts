// Database access for issue related operations
import { prisma } from "./prisma/prismaClient";
import { IssueStatus, IssueType, IssueAuthorized, IssueError } from "../generated/prisma/enums";

// Issue Creation and Management
export async function createAuthenticatedIssue(
	title: string,
	description: string,
	latitude: number,
	longitude: number,
	issueType: IssueType,
	userId: number,
	imageBlobId?: string,
) {
	const issue = await prisma.issue.create({
		data: {
			title,
			description,
			latitude,
			longitude,
			issueType,
			userId,
			imageBlobId: imageBlobId ?? null,
			// Dev mode: set all issues as valid/authorized by default
			authorized: IssueAuthorized.TRUE,
			error: IssueError.NONE,
		},
	});

	return issue;
}

export async function createGuestIssue(
	title: string,
	description: string,
	latitude: number,
	longitude: number,
	issueType: IssueType,
	guestTokenId: number,
	imageBlobId?: string,
	// All "invalid" users get assigned to userId -1. This is required by the schema, so added here.
	// If guest token id is NOT null, then ignore the userID field
) {
	const issue = await prisma.issue.create({
		data: {
			title,
			description,
			latitude,
			longitude,
			issueType,
			guestTokenId,
			userId: -1,
			imageBlobId: imageBlobId ?? null,
			// Dev mode: set all issues as valid/authorized by default
			authorized: IssueAuthorized.TRUE,
			error: IssueError.NONE,
		},
	});

	return issue;
}

export async function updateIssueImage(issueId: number, imageBlobId: string) {
	const issue = await prisma.issue.update({ where: { id: issueId }, data: { imageBlobId } });
	return issue;
}

export async function updateIssueStatus(issueId: number, status: IssueStatus) {
	const issue = await prisma.issue.update({ where: { id: issueId }, data: { status } });
	return issue;
}

export async function authorizeIssue(issueId: number) {
	const issue = await prisma.issue.update({ where: { id: issueId }, data: { authorized: IssueAuthorized.TRUE } });
	return issue;
}

export async function flagIssueError(issueId: number, error: IssueError) {
	const issue = await prisma.issue.update({ where: { id: issueId }, data: { error } });
	return issue;
}

export async function deleteIssue(issueId: number) {
	const existing = await prisma.issue.findUnique({ where: { id: issueId } });
	if (!existing) return null;

	// collect related comment ids so we can delete comment upvotes first
	const comments = await prisma.comment.findMany({ where: { issueId }, select: { id: true } });
	const commentIds = comments.map((c) => c.id);

	await prisma.$transaction([
		prisma.commentUpvote.deleteMany({ where: { commentId: { in: commentIds } } }),
		prisma.comment.deleteMany({ where: { issueId } }),
		prisma.issueUpvote.deleteMany({ where: { issueId } }),
		prisma.issueResolutionVote.deleteMany({ where: { issueId } }),
		prisma.issue.delete({ where: { id: issueId } }),
	]);

	return existing;
}

// Issue Retrieval (Filtering and Map)
export async function getIssueById(issueId: number) {
	const issue = await prisma.issue.findUnique({
		where: { id: issueId },
		include: {
			user: { select: { id: true, name: true, email: true } },
			guestToken: { select: { id: true, token: true } },
			_count: { select: { upvotes: true, comments: true } },
		},
	});

	return issue;
}

// TODO: Change this to use postGIS (done)
export async function getIssuesByLocationBox(
	minLat: number,
	maxLat: number,
	minLng: number,
	maxLng: number,
	filters?: { type?: IssueType; status?: IssueStatus }
) {
	return await prisma.issue.findMany({
		where: {
			latitude: { gte: minLat, lte: maxLat },
			longitude: { gte: minLng, lte: maxLng },
			...(filters?.type && { issueType: filters.type }),
			...(filters?.status && { status: filters.status }),
		},
		include: {
			_count: { select: { upvotes: true, comments: true } },
		},
		orderBy: { createdAt: "desc" },
	});
}

export async function getIssuesByStatus(status: IssueStatus) {
	const issues = await prisma.issue.findMany({ where: { status }, orderBy: { createdAt: 'desc' } });
	return issues;
}

export async function getIssuesByUser(userId: number) {
	const issues = await prisma.issue.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
	return issues;
}

export async function getIssuesByGuestToken(guestTokenId: number) {
	const issues = await prisma.issue.findMany({ where: { guestTokenId }, orderBy: { createdAt: 'desc' } });
	return issues;
}

// Issue Interaction (Upvotes and Resolution)
export async function addIssueUpvote(userId: number, issueId: number) {
	const upvote = await prisma.issueUpvote.create({ data: { userId, issueId } });
	return upvote;
}

export async function removeIssueUpvote(userId: number, issueId: number) {
	const res = await prisma.issueUpvote.deleteMany({ where: { userId, issueId } });
	return res.count > 0;
}

export async function getIssueUpvoteCount(issueId: number) {
	const count = await prisma.issueUpvote.count({ where: { issueId } });
	return count;
}

export async function hasUserUpvotedIssue(userId: number, issueId: number) {
	const count = await prisma.issueUpvote.count({ where: { userId, issueId } });
	return count > 0;
}

export async function submitResolutionVote(userId: number, issueId: number, isResolved: boolean) {
	const vote = await prisma.issueResolutionVote.upsert({
		where: { issueId_userId: { issueId, userId } },
		create: { issueId, userId, isResolved },
		update: { isResolved },
	});

	return vote;
}

export async function getResolutionVoteTally(issueId: number) {
	const [trueCount, falseCount] = await prisma.$transaction([
		prisma.issueResolutionVote.count({ where: { issueId, isResolved: true } }),
		prisma.issueResolutionVote.count({ where: { issueId, isResolved: false } }),
	]);

	return { trueCount, falseCount };
}

// Comments
export async function addComment(userId: number, issueId: number, content: string) {
	const comment = await prisma.comment.create({ data: { userId, issueId, content } });
	return comment;
}

export async function getCommentsForIssue(issueId: number) {
	const comments = await prisma.comment.findMany({
		where: { issueId },
		orderBy: { createdAt: 'asc' },
		include: {
			user: { select: { id: true, name: true } },
			upvotes: { select: { id: true, userId: true } },
		},
	});

	return comments;
}

export async function deleteComment(commentId: number) {
	const existing = await prisma.comment.findUnique({ where: { id: commentId } });
	if (!existing) return null;

	await prisma.$transaction([
		prisma.commentUpvote.deleteMany({ where: { commentId } }),
		prisma.comment.delete({ where: { id: commentId } }),
	]);

	return existing;
}

export async function flagComment(commentId: number, reason: string | null) {
	const comment = await prisma.comment.update({ where: { id: commentId }, data: { isFlagged: true, flaggedReason: reason ?? null } });
	return comment;
}

export async function addCommentUpvote(userId: number, commentId: number) {
	const upvote = await prisma.commentUpvote.create({ data: { userId, commentId } });
	return upvote;
}

export async function removeCommentUpvote(userId: number, commentId: number) {
	const res = await prisma.commentUpvote.deleteMany({ where: { userId, commentId } });
	return res.count > 0;
}

export default {
	createAuthenticatedIssue,
	createGuestIssue,
	updateIssueImage,
	updateIssueStatus,
	authorizeIssue,
	flagIssueError,
	deleteIssue,
	getIssueById,
	getIssuesByLocationBox,
	getIssuesByStatus,
	getIssuesByUser,
	getIssuesByGuestToken,
	addIssueUpvote,
	removeIssueUpvote,
	getIssueUpvoteCount,
	hasUserUpvotedIssue,
	submitResolutionVote,
	getResolutionVoteTally,
	addComment,
	getCommentsForIssue,
	deleteComment,
	flagComment,
	addCommentUpvote,
	removeCommentUpvote,
};