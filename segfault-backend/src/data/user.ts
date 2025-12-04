// Database access for user related operations
import { prisma } from "./prisma/prismaClient";
import { UserRole } from "../generated/prisma/enums";
// import type { User } from "./src/generated/prisma/client";

// Pass in the hashed password. Must define a role. Dont use this for a guest- skip login entirely
export async function createNewUser(email: string, password: string, name: string | null, role: UserRole,) {
	const user = await prisma.user.create({
		data: {
			email,
			password,
			name,
			role,
		},
	});

	return user;
}

export async function getUserById(id: number) {
	const user = await prisma.user.findUnique({
		where: { id },
	});

	return user;
}

export async function getUserByEmail(email: string) {
	const user = await prisma.user.findUnique({
		where: { email },
	});

	return user;
}

export async function updateUserProfile(
	userId: number,
	data: { name?: string | null; email?: string },
) {
	const upsert = await prisma.user.update({
		where: { id: userId },
		data: {
			...(data.name !== undefined ? { name: data.name } : {}),
			...(data.email !== undefined ? { email: data.email } : {}),
		},
	});

	return upsert;
}

export async function updateUserPassword(userId: number, newHashedPassword: string) {
	const user = await prisma.user.update({
		where: { id: userId },
		data: { password: newHashedPassword },
	});

	return user;
}

export async function deleteUser(userId: number) {
	const existingUser = await prisma.user.findUnique({ where: { id: userId } });
	if (!existingUser) return null;

	await prisma.$transaction([
		prisma.commentUpvote.deleteMany({ where: { userId } }),
		prisma.issueUpvote.deleteMany({ where: { userId } }),
		prisma.issueResolutionVote.deleteMany({ where: { userId } }),
		prisma.comment.deleteMany({ where: { userId } }),
		prisma.userBadge.deleteMany({ where: { userId } }),
		prisma.notification.deleteMany({ where: { userId } }),
		prisma.issue.deleteMany({ where: { userId } }),
		prisma.user.delete({ where: { id: userId } }),
	]);

	return existingUser;
}

export async function banUser(userId: number, reason: string | null, expiresAt: Date | null) {
	const user = await prisma.user.update({
		where: { id: userId },
		data: {
			isBanned: true,
			banReason: reason ?? null,
			banExpiresAt: expiresAt ?? null,
		},
	});

	return user;
}

export async function unbanUser(userId: number) {
	const user = await prisma.user.update({
		where: { id: userId },
		data: {
			isBanned: false,
			banReason: null,
			banExpiresAt: null,
		},
	});

	return user;
}

export async function updateUserCredibility(userId: number, delta: number) {
	const user = await prisma.user.update({
		where: { id: userId },
		data: {
			credibility: { increment: delta },
		},
	});

	return user;
}

export async function getAllUsers(page = 1, pageSize = 50) {
	const take = pageSize;
	const skip = (page - 1) * pageSize;

	const [users, total] = await prisma.$transaction([
		prisma.user.findMany({ skip, take, orderBy: { id: 'asc' } }),
		prisma.user.count(),
	]);

	return { users, total, page, pageSize };
}

// gets ALL users
export async function getAllUsersUnsafe() {
	const users = await prisma.user.findMany({ orderBy: { id: 'asc' } });
	return users;
}

export async function getBannedUsers(page = 1, pageSize = 50) {
	const take = pageSize;
	const skip = (page - 1) * pageSize;

	const [users, total] = await prisma.$transaction([
		prisma.user.findMany({ where: { isBanned: true }, skip, take, orderBy: { id: 'asc' } }),
		prisma.user.count({ where: { isBanned: true } }),
	]);

	return { users, total, page, pageSize };
}

export async function getBannedUsersUnsafe() {
	const users = await prisma.user.findMany({ where: { isBanned: true }, orderBy: { id: 'asc' } });
	return users;
}

export async function awardBadgeToUser(userId: number, name: string) {
	const badge = await prisma.userBadge.create({ data: { userId, name } });
	return badge;
}

export async function removeBadgeFromUser(badgeId: number) {
	const existing = await prisma.userBadge.findUnique({ where: { id: badgeId } });
	if (!existing) return null;

	const deleted = await prisma.userBadge.delete({ where: { id: badgeId } });
	return deleted;
}

export async function getBadgesForUser(userId: number) {
	const badges = await prisma.userBadge.findMany({ where: { userId }, orderBy: { awardedAt: 'desc' } });
	return badges;
}

export async function createGuestToken(token: string) {
	const guest = await prisma.guestToken.create({ data: { token } });
	return guest;
}

export async function getGuestTokenByToken(token: string) {
	const guest = await prisma.guestToken.findUnique({ where: { token } });
	return guest;
}

export async function deleteGuestToken(token: string) {
	const existing = await prisma.guestToken.findUnique({ where: { token } });
	if (!existing) return null;

	const deleted = await prisma.guestToken.delete({ where: { token } });
	return deleted;
}

export async function getNotificationsForUser(userId: number) {
	const notifications = await prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
	return notifications;
}

export async function setNotificationRead(notificationId: number, read: boolean) {
	const notif = await prisma.notification.update({ where: { id: notificationId }, data: { read } });
	return notif;
}

export default {
	createNewUser,
	getUserById,
	getUserByEmail,
	updateUserProfile,
	updateUserPassword,
	deleteUser,
	banUser,
	unbanUser,
	updateUserCredibility,
	getAllUsers,
	getAllUsersUnsafe,
	getBannedUsers,
	getBannedUsersUnsafe,
	awardBadgeToUser,
	removeBadgeFromUser,
	getBadgesForUser,
	createGuestToken,
	getGuestTokenByToken,
	deleteGuestToken,
	getNotificationsForUser,
	setNotificationRead,
};