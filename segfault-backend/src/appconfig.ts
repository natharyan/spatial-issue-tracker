export const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

export const GOOGLE_OAUTH = {
	CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? '1030819278738-1fnklv7adb14ktovidi3ate2rlbhbe53.apps.googleusercontent.com',
	CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? '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',
	REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI ?? 'https://segfault-backend.politeriver-a25e3b65.westeurope.azurecontainerapps.io/auth/callback',
};

export const JWT = {
	SECRET: process.env.JWT_SECRET ?? 'CHANGE_THIS_JWT_SECRET',
};

export default { FRONTEND_URL, GOOGLE_OAUTH, JWT };
