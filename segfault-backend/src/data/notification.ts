// Notification DB helpers
import { prisma } from "./prisma/prismaClient";
import { NotificationType } from "../generated/prisma/enums";

export async function createNotification(userId: number, type: NotificationType, message: string) {
  const notif = await prisma.notification.create({ data: { userId, type, message } });
  return notif;
}

export async function getUserNotifications(userId: number) {
  const notifs = await prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  return notifs;
}

// Accept one or many notification ids to mark as read
export async function markNotificationAsRead(notificationIds: number[] | number) {
  const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds];
  const res = await prisma.notification.updateMany({ where: { id: { in: ids } }, data: { read: true } });
  return res.count;
}

export async function markAllNotificationsAsRead(userId: number) {
  const res = await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  return res.count;
}

export default {
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
