import type { Request, Response } from "express";
import { loginWithGoogle, generateGuestSession, registerWithEmail, loginWithEmail } from "../../services/authService";
import { FRONTEND_URL } from "../../appconfig";

export async function handleGoogleCallback(req: Request, res: Response) {
	try {
		const { code } = req.query;
		if (!code || typeof code !== 'string') {
			return res.redirect(`${FRONTEND_URL}/login?error=missing_code`);
		}

		const token = await loginWithGoogle(code);

		const sevenDaysMs = 1000 * 60 * 60 * 24 * 7;
		res.cookie('session', token, { httpOnly: true, maxAge: sevenDaysMs, sameSite: 'lax' });

		// Pass token to frontend for localStorage storage
		return res.redirect(`${FRONTEND_URL}/auth/google/callback?token=${encodeURIComponent(token)}`);
	} catch (err: any) {
		console.error('Google OAuth callback failed', err);
		return res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent(err?.message ?? 'login_failed')}`);
	}
}

export async function handleGoogleLogin(req: Request, res: Response) {
	try {
		const { code } = req.body ?? {};
		if (!code) {
			return res.status(400).json({ error: 'Missing authorization code' });
		}

		const token = await loginWithGoogle(code);

		const sevenDaysMs = 1000 * 60 * 60 * 24 * 7;
		res.cookie('session', token, { httpOnly: true, maxAge: sevenDaysMs, sameSite: 'lax' });

		return res.status(200).json({ ok: true });
	} catch (err: any) {
		console.error('Google login failed', err);
		return res.status(500).json({ error: err?.message ?? 'Login failed' });
	}
}

export async function handleGuestLogin(_req: Request, res: Response) {
	try {
		const { token, guestTokenId } = await generateGuestSession();

		const oneDayMs = 1000 * 60 * 60 * 24;
		res.cookie('session', token, { httpOnly: true, maxAge: oneDayMs, sameSite: 'lax' });

		return res.status(200).json({ ok: true, guestTokenId });
	} catch (err: any) {
		console.error('Guest login failed', err);
		return res.status(500).json({ error: err?.message ?? 'Guest login failed' });
	}
}

export async function handleRegister(req: Request, res: Response) {
	try {
		const { email, password, name } = req.body ?? {};

		if (!email || typeof email !== 'string') {
			return res.status(400).json({ error: 'Email is required' });
		}

		if (!password || typeof password !== 'string' || password.length < 6) {
			return res.status(400).json({ error: 'Password must be at least 6 characters' });
		}

		const token = await registerWithEmail(email.trim().toLowerCase(), password, name ?? null);

		const sevenDaysMs = 1000 * 60 * 60 * 24 * 7;
		res.cookie('session', token, { httpOnly: true, maxAge: sevenDaysMs, sameSite: 'lax' });

		return res.status(201).json({ ok: true, token });
	} catch (err: any) {
		console.error('Registration failed', err);
		return res.status(400).json({ error: err?.message ?? 'Registration failed' });
	}
}

export async function handleLogin(req: Request, res: Response) {
	try {
		const { email, password } = req.body ?? {};

		if (!email || typeof email !== 'string') {
			return res.status(400).json({ error: 'Email is required' });
		}

		if (!password || typeof password !== 'string') {
			return res.status(400).json({ error: 'Password is required' });
		}

		const token = await loginWithEmail(email.trim().toLowerCase(), password);

		const sevenDaysMs = 1000 * 60 * 60 * 24 * 7;
		res.cookie('session', token, { httpOnly: true, maxAge: sevenDaysMs, sameSite: 'lax' });

		return res.status(200).json({ ok: true, token });
	} catch (err: any) {
		console.error('Login failed', err);
		return res.status(401).json({ error: err?.message ?? 'Login failed' });
	}
}

// ... existing imports

export async function changePassword(req: Request, res: Response) {
	try {
		if (!req.user) {
			return res.status(401).json({ error: "Authentication required" });
		}

		const { oldPassword, newPassword } = req.body;

		if (!oldPassword || !newPassword) {
			return res.status(400).json({ error: "Old and new passwords are required" });
		}

		if (newPassword.length < 6) {
			return res.status(400).json({ error: "New password must be at least 6 characters" });
		}

		const success = await import("../../services/authService").then(m => m.changeUserPassword(req.user!.id, oldPassword, newPassword));

		if (!success) {
			return res.status(401).json({ error: "Invalid old password" });
		}

		return res.json({ success: true });
	} catch (err: any) {
		console.error("Change password failed", err);
		return res.status(500).json({ error: err?.message ?? "Failed to change password" });
	}
}

export default { handleGoogleCallback, handleGoogleLogin, handleGuestLogin, handleRegister, handleLogin, changePassword };
