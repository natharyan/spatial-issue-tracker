import { GOOGLE_OAUTH, JWT } from "../appconfig";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { redisClient } from "../data/redisClient";
import { getUserByEmail, createNewUser } from "../data/user";
import { UserRole } from "../generated/prisma/enums";
import { sendVerificationEmail } from "./emailService";

async function postTokenRequest(body: URLSearchParams) {
    const tokenUrl = "https://oauth2.googleapis.com/token";

    if (typeof (globalThis as any).fetch === "function") {
        const res = await (globalThis as any).fetch(tokenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: body.toString(),
        });

        if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
        return res.json();
    }

    return new Promise<any>((resolve, reject) => {
        const https = require("https");
        const data = body.toString();
        const u = new URL(tokenUrl);

        const req = https.request(
            {
                hostname: u.hostname,
                path: u.pathname,
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(data) },
            },
            (res: any) => {
                let chunks: any[] = [];
                res.on("data", (c: any) => chunks.push(c));
                res.on("end", () => {
                    const body = Buffer.concat(chunks).toString();
                    try {
                        const parsed = JSON.parse(body);
                        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
                        else reject(parsed);
                    } catch (err) {
                        reject(err);
                    }
                });
            },
        );

        req.on("error", (e: any) => reject(e));
        req.write(data);
        req.end();
    });
}

// Exchange the authorization code for tokens and return basic profile (email, name, picture)
export async function exchangeGoogleCodeForProfile(code: string) {
    const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: GOOGLE_OAUTH.CLIENT_ID,
        client_secret: GOOGLE_OAUTH.CLIENT_SECRET,
        redirect_uri: GOOGLE_OAUTH.REDIRECT_URI,
    });

    const tokenResp = await postTokenRequest(body);

    const idToken: string | undefined = tokenResp.id_token;
    if (!idToken) {
        throw new Error("No id_token returned from Google");
    }

    const decoded: any = jwt.decode(idToken);
    if (!decoded) {
        throw new Error("Unable to decode id_token");
    }

    const email = decoded.email as string | undefined;
    const name = decoded.name as string | undefined;
    const picture = decoded.picture as string | undefined;

    if (!email) {
        throw new Error("No email present in Google id_token");
    }

    return { email, name: name ?? null, picture: picture ?? null };
}

export async function loginWithGoogle(code: string) {
    const profile = await exchangeGoogleCodeForProfile(code);

    // Check for Admin override email
    const isAdmin = profile.email.toLowerCase().endsWith('@admin.com');
    // Check if gov email
    const isGov = profile.email.toLowerCase().endsWith('.gov.in');
    const targetRole = isAdmin ? UserRole.ADMIN : (isGov ? UserRole.PIGS : UserRole.USER);

    // Lookup or create user
    let user = await getUserByEmail(profile.email);
    if (!user) {
        user = await createNewUser(profile.email, "", profile.name, targetRole as any, profile.picture);
    } else if (profile.picture && !(user as any).picture) {
        const { prisma } = await import("../data/prisma/prismaClient");
        await prisma.user.update({ where: { id: user.id }, data: { picture: profile.picture, name: profile.name || user.name } });
    }

    const tokenPayload = {
        userId: user.id,
        role: (user as any).role,
        name: profile.name || user.name || null,
        email: user.email,
        picture: profile.picture || (user as any).picture || null,
        isGov: (user as any).role === 'PIGS' || isGov,
    };
    const token = jwt.sign(tokenPayload, JWT.SECRET, { expiresIn: '7d' });

    const key = `session:${token}`;
    const value = JSON.stringify({ userId: user.id, role: (user as any).role });
    // 7 days TTL
    const expirySeconds = 60 * 60 * 24 * 7;

    await redisClient.set(key, value, 'EX', expirySeconds);

    return token;
}

export async function registerWithEmail(email: string, password: string, name: string | null) {
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
        throw new Error("User with this email already exists");
    }

    // check for Admin override email
    if (email.toLowerCase().endsWith('@admin.com')) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await createNewUser(email, hashedPassword, name, UserRole.ADMIN, null);

        // auto verify admin
        const { prisma } = await import("../data/prisma/prismaClient");
        await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });

        const tokenPayload = {
            userId: user.id,
            role: UserRole.ADMIN,
            name: user.name || null,
            email: user.email,
            picture: null,
            isGov: false,
        };
        const token = jwt.sign(tokenPayload, JWT.SECRET, { expiresIn: '7d' });

        const key = `session:${token}`;
        const value = JSON.stringify({ userId: user.id, role: UserRole.ADMIN });
        const expirySeconds = 60 * 60 * 24 * 7;

        await redisClient.set(key, value, 'EX', expirySeconds);
        return token;
    }

    // Auto-detect government officials by .gov.in email
    const isGov = email.toLowerCase().endsWith('.gov.in');
    const role = isGov ? UserRole.PIGS : UserRole.USER;

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createNewUser(email, hashedPassword, name, role as any, null);

    // Auto verify user (Skipping 2FA)
    const { prisma } = await import("../data/prisma/prismaClient");
    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });

    const tokenPayload = {
        userId: user.id,
        role: (user as any).role,
        name: user.name || null,
        email: user.email,
        picture: null,
        isGov: (user as any).role === 'PIGS' || isGov,
    };
    const token = jwt.sign(tokenPayload, JWT.SECRET, { expiresIn: '7d' });

    const key = `session:${token}`;
    const value = JSON.stringify({ userId: user.id, role: (user as any).role });
    const expirySeconds = 60 * 60 * 24 * 7;

    await redisClient.set(key, value, 'EX', expirySeconds);

    return token;
}

export async function loginWithEmail(email: string, password: string) {
    console.log(`[Auth] Attempting login for email: ${email}`);
    
    const user = await getUserByEmail(email);
    if (!user) {
        console.log(`[Auth] No user found with email: ${email}`);
        throw new Error("Invalid email or password");
    }

    console.log(`[Auth] User found: id=${user.id}, hasPassword=${!!user.password}`);

    if (!user.password) {
        console.log(`[Auth] User has no password (likely Google OAuth account)`);
        throw new Error("This account uses Google sign-in");
    }

    const isValid = await bcrypt.compare(password, user.password);
    console.log(`[Auth] Password comparison result: ${isValid}`);
    
    if (!isValid) {
        throw new Error("Invalid email or password");
    }

    // 2FA Removed: Proceed directly to token generation

    const tokenPayload = {
        userId: user.id,
        role: (user as any).role,
        name: user.name || null,
        email: user.email,
        picture: (user as any).picture || null,
        isGov: (user as any).role === 'PIGS',
    };
    const token = jwt.sign(tokenPayload, JWT.SECRET, { expiresIn: '7d' });

    const key = `session:${token}`;
    const value = JSON.stringify({ userId: user.id, role: (user as any).role });
    const expirySeconds = 60 * 60 * 24 * 7;

    await redisClient.set(key, value, 'EX', expirySeconds);

    return token;
}

export async function verify2FACode(userId: number, code: string) {
    const redisKey = `2fa:${userId}`;
    const storedCode = await redisClient.get(redisKey);

    if (!storedCode || storedCode !== code) {
        throw new Error("Invalid or expired verification code");
    }

    // Code valid, verify user
    const { prisma } = await import("../data/prisma/prismaClient");
    const user = await prisma.user.update({
        where: { id: userId },
        data: { emailVerified: true }
    });

    await redisClient.del(redisKey);

    // Generate Token
    const isGov = user.email.toLowerCase().endsWith('.gov.in');
    const tokenPayload = {
        userId: user.id,
        role: user.role,
        name: user.name || null,
        email: user.email,
        picture: user.picture || null,
        isGov: user.role === 'PIGS' || isGov,
    };
    const token = jwt.sign(tokenPayload, JWT.SECRET, { expiresIn: '7d' });

    const key = `session:${token}`;
    const value = JSON.stringify({ userId: user.id, role: user.role });
    const expirySeconds = 60 * 60 * 24 * 7;

    await redisClient.set(key, value, 'EX', expirySeconds);

    return token;
}

export async function generateGuestSession() {
    const { createGuestToken } = await import("../data/user");
    const { v4: uuidv4 } = await import("uuid");

    const guestUuid = uuidv4();
    const guestRecord = await createGuestToken(guestUuid);

    const tokenPayload = { guestTokenId: guestRecord.id, role: UserRole.GUEST };
    const token = jwt.sign(tokenPayload, JWT.SECRET, { expiresIn: '1d' });

    const key = `session:${token}`;
    const value = JSON.stringify({ guestTokenId: guestRecord.id, role: UserRole.GUEST });
    // 1 day TTL for guests
    const expirySeconds = 60 * 60 * 24;

    await redisClient.set(key, value, 'EX', expirySeconds);

    return { token, guestTokenId: guestRecord.id };
}

export async function changeUserPassword(userId: number, oldPass: string, newPass: string): Promise<boolean> {
    const { prisma } = await import("../data/prisma/prismaClient");
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.password) return false;

    const isValid = await bcrypt.compare(oldPass, user.password);
    if (!isValid) return false;

    const hashed = await bcrypt.hash(newPass, 10);
    await prisma.user.update({
        where: { id: userId },
        data: { password: hashed }
    });
    return true;
}

export default { exchangeGoogleCodeForProfile, loginWithGoogle, registerWithEmail, loginWithEmail, generateGuestSession, changeUserPassword, verify2FACode };
