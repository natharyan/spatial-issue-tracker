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
	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		throw new Error("Invalid latitude/longitude");
	}

	// Use SQL to insert with PostGIS geometry
	const result = await prisma.$queryRaw<{ id: number }[]>`
		INSERT INTO "Issue" (title, description, latitude, longitude, location, "issueType", "userId", "imageBlobId", authorized, error, "createdAt")
		VALUES (${title}, ${description}, ${latitude}, ${longitude}, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326), ${issueType}::"IssueType", ${userId}, ${imageBlobId}, 'FALSE'::"IssueAuthorized", 'PENDING'::"IssueError", NOW())
		RETURNING id
	`;

	const issueId = result[0]?.id;
	if (!issueId) throw new Error("Failed to create issue");

	// Fetch the created issue for return
	return getIssueById(issueId);
}

export async function createGuestIssue(
	title: string,
	description: string,
	latitude: number,
	longitude: number,
	issueType: IssueType,
	guestTokenId: number,
	imageBlobId?: string,
) {
	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		throw new Error("Invalid latitude/longitude");
	}

	const result = await prisma.$queryRaw<{ id: number }[]>`
		INSERT INTO "Issue" (title, description, latitude, longitude, location, "issueType", "guestTokenId", "userId", "imageBlobId", authorized, error, "createdAt")
		VALUES (${title}, ${description}, ${latitude}, ${longitude}, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326), ${issueType}::"IssueType", ${guestTokenId}, -1, ${imageBlobId}, 'FALSE'::"IssueAuthorized", 'PENDING'::"IssueError", NOW())
		RETURNING id
	`;

	const issueId = result[0]?.id;
	if (!issueId) throw new Error("Failed to create issue");

	return getIssueById(issueId);
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
	// Use raw SQL to extract lat/lng from PostGIS geometry
	const issues = await prisma.$queryRaw<Array<{
		id: number;
		title: string;
		description: string;
		latitude: number;
		longitude: number;
		status: string;
		authorized: string;
		error: string;
		createdAt: Date;
		updatedAt: Date;
		imageBlobId: string | null;
		severity: number | null;
		userId: number;
		guestTokenId: number | null;
		issueType: string;
		user_id: number | null;
		user_name: string | null;
		user_email: string | null;
		upvote_count: number;
		comment_count: number;
	}>>`
		SELECT 
			i.id, i.title, i.description,
			ST_Y(i.location) as latitude,
			ST_X(i.location) as longitude,
			i.status, i.authorized, i.error, i."createdAt", i."updatedAt",
			i."imageBlobId", i.severity, i."userId", i."guestTokenId", i."issueType",
			u.id as user_id, u.name as user_name, u.email as user_email,
			COALESCE(upvote_count, 0) as upvote_count,
			COALESCE(comment_count, 0) as comment_count
		FROM "Issue" i
		LEFT JOIN "User" u ON i."userId" = u.id
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
		WHERE i.id = ${issueId}
	`;

	const issue = issues[0];
	if (!issue) return null;

	// Format to match expected return type
	return {
		...issue,
		_count: {
			upvotes: issue.upvote_count,
			comments: issue.comment_count,
		},
		user: issue.user_id ? {
			id: issue.user_id,
			name: issue.user_name,
			email: issue.user_email,
		} : null,
		guestToken: issue.guestTokenId ? { id: issue.guestTokenId, token: "hidden" } : null,
	};
}

// Updated location-based search using PostGIS
export async function getIssuesByLocationBox(
	minLat: number,
	maxLat: number,
	minLng: number,
	maxLng: number,
	filters?: { type?: IssueType; status?: IssueStatus }
) {
	let typeFilter = '';
	let statusFilter = '';
	
	if (filters?.type) {
		typeFilter = `AND i."issueType" = ${filters.type}::"IssueType"`;
	}
	
	if (filters?.status) {
		statusFilter = `AND i.status = ${filters.status}::"IssueStatus"`;
	}

	const issues = await prisma.$queryRaw<Array<{
		id: number;
		title: string;
		description: string;
		latitude: number;
		longitude: number;
		status: string;
		issueType: string;
		createdAt: Date;
		upvote_count: number;
		comment_count: number;
	}>>`
		SELECT 
			i.id, i.title, i.description,
			ST_Y(i.location) as latitude,
			ST_X(i.location) as longitude,
			i.status, i."issueType", i."createdAt",
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
		${typeFilter}
		${statusFilter}
		ORDER BY i."createdAt" DESC
	`;

	return issues.map(issue => ({
		...issue,
		_count: {
			upvotes: issue.upvote_count,
			comments: issue.comment_count,
		}
	}));
}

// Add new function for distance-based queries (e.g., "issues within 5km")
export async function getIssuesWithinDistance(
	centerLat: number,
	centerLng: number,
	distanceMeters: number,
	filters?: { type?: IssueType; status?: IssueStatus }
) {
	let typeFilter = '';
	let statusFilter = '';
	
	if (filters?.type) {
		typeFilter = `AND i."issueType" = ${filters.type}::"IssueType"`;
	}
	
	if (filters?.status) {
		statusFilter = `AND i.status = ${filters.status}::"IssueStatus"`;
	}

	const issues = await prisma.$queryRaw<Array<{
		id: number;
		title: string;
		description: string;
		latitude: number;
		longitude: number;
		distance_meters: number;
		status: string;
		issueType: string;
		createdAt: Date;
	}>>`
		SELECT 
			i.id, i.title, i.description,
			ST_Y(i.location) as latitude,
			ST_X(i.location) as longitude,
			ST_Distance(
				i.location::geography,
				ST_SetSRID(ST_MakePoint(${centerLng}, ${centerLat}), 4326)::geography
			) as distance_meters,
			i.status, i."issueType", i."createdAt"
		FROM "Issue" i
		WHERE ST_DWithin(
			i.location::geography,
			ST_SetSRID(ST_MakePoint(${centerLng}, ${centerLat}), 4326)::geography,
			${distanceMeters}
		)
		${typeFilter}
		${statusFilter}
		ORDER BY distance_meters ASC
	`;

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
			user: {
				select: {
					id: true,
					name: true,
					credibility: true,
					badges: { select: { name: true }, orderBy: { awardedAt: 'asc' } },
				},
			},
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

export async function getIssuesByUser(userId: number) {
	const issues = await prisma.$queryRaw<Array<{
		id: number;
		title: string;
		description: string;
		latitude: number;
		longitude: number;
		status: string;
		issueType: string;
		createdAt: Date;
		imageBlobId: string | null;
	}>>`
		SELECT 
			i.id, i.title, i.description,
			ST_Y(i.location) as latitude,
			ST_X(i.location) as longitude,
			i.status, i."issueType", i."createdAt", i."imageBlobId"
		FROM "Issue" i
		WHERE i."userId" = ${userId}
		AND i.location IS NOT NULL
		ORDER BY i."createdAt" DESC
	`;
	return issues;
}

export async function getIssuesByStatus(status: IssueStatus) {
	const issues = await prisma.$queryRaw<Array<{
		id: number;
		title: string;
		description: string;
		latitude: number;
		longitude: number;
		status: string;
		issueType: string;
		createdAt: Date;
		imageBlobId: string | null;
	}>>`
		SELECT 
			i.id, i.title, i.description,
			ST_Y(i.location) as latitude,
			ST_X(i.location) as longitude,
			i.status, i."issueType", i."createdAt", i."imageBlobId"
		FROM "Issue" i
		WHERE i.status = ${status}::"IssueStatus"
		AND i.location IS NOT NULL
		ORDER BY i."createdAt" DESC
	`;
	return issues;
}

export async function getIssuesByGuestToken(guestTokenId: number) {
	const issues = await prisma.$queryRaw<Array<{
		id: number;
		title: string;
		description: string;
		latitude: number;
		longitude: number;
		status: string;
		issueType: string;
		createdAt: Date;
		imageBlobId: string | null;
	}>>`
		SELECT 
			i.id, i.title, i.description,
			ST_Y(i.location) as latitude,
			ST_X(i.location) as longitude,
			i.status, i."issueType", i."createdAt", i."imageBlobId"
		FROM "Issue" i
		WHERE i."guestTokenId" = ${guestTokenId}
		AND i.location IS NOT NULL
		ORDER BY i."createdAt" DESC
	`;
	return issues;
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
	getIssuesWithinDistance,
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