import {PrismaClient} from "../../generated/prisma/client"

const globalForPrisma = global as unknown as {prisma: PrismaClient | undefined};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

globalForPrisma.prisma = prisma;