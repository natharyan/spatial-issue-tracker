import { GOOGLE_OAUTH, JWT } from "../appconfig";
import jwt from "jsonwebtoken";
import { redisClient } from "../data/redisClient";
import { getUserByEmail, createNewUser } from "../data/user";
import { UserRole } from "../generated/prisma/enums";

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

	// Fallback to node https
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

// Exchange the authorization code for tokens and return basic profile (email, name)
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

	if (!email) {
        throw new Error("No email present in Google id_token");
    }

	return { email, name: name ?? null };
}

export async function loginWithGoogle(code: string) {
	const profile = await exchangeGoogleCodeForProfile(code);

	// Lookup or create user
	let user = await getUserByEmail(profile.email);
	if (!user) {
		user = await createNewUser(profile.email, "", profile.name, UserRole.USER as any);
	}

	const tokenPayload = { userId: user.id, role: (user as any).role };
	const token = jwt.sign(tokenPayload, JWT.SECRET, { expiresIn: '7d' });

	const key = `session:${token}`;
	const value = JSON.stringify({ userId: user.id, role: (user as any).role });
	// 7 days TTL
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

export default { exchangeGoogleCodeForProfile, loginWithGoogle, generateGuestSession };
