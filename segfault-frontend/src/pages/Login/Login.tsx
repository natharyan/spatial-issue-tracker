import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Container,
    Divider,
    IconButton,
    InputAdornment,
    Link,
    TextField,
    Typography,
    Alert,
    CircularProgress,
    Paper,
    Stack,
    Fade
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    Google as GoogleIcon,
    PersonOutline as GuestIcon,
    ArrowBack as ArrowBackIcon,
    MarkEmailRead as EmailIcon
} from '@mui/icons-material';
import { authAPI } from '../../api/axios';
import { AxiosError } from 'axios';
import { useAuth } from '../../state/authContext';
import { AZURE_BACKEND_URL } from '../../constants';

const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 2FA State
    const [step, setStep] = useState<'login' | '2fa'>('login');
    const [userId, setUserId] = useState<number | null>(null);
    const [twoFaCode, setTwoFaCode] = useState('');

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const result = await authAPI.login(email, password);

            if (result.require2fa) {
                setUserId(result.userId);
                setStep('2fa');
            } else if (result.token) {
                localStorage.setItem('authToken', result.token);
                login(result.token);
                navigate('/dashboard');
            }
        } catch (err) {
            let errorMsg = 'Login failed. Please try again.';
            if (err instanceof AxiosError && err.response?.data && typeof err.response.data === 'object' && 'error' in err.response.data) {
                errorMsg = (err.response.data as { error?: string }).error || errorMsg;
            }
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify2FA = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId || !twoFaCode) return;

        setLoading(true);
        setError(null);

        try {
            const result = await authAPI.verify2FA(userId, twoFaCode);
            if (result.token) {
                localStorage.setItem('authToken', result.token);
                login(result.token);
                navigate('/dashboard');
            }
        } catch (err) {
            let errorMsg = 'Verification failed. Invalid code.';
            if (err instanceof AxiosError && err.response?.data && typeof err.response.data === 'object' && 'error' in err.response.data) {
                errorMsg = (err.response.data as { error?: string }).error || errorMsg;
            }
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        const clientId = '1030819278738-1fnklv7adb14ktovidi3ate2rlbhbe53.apps.googleusercontent.com';
        const redirectUri = 'https://segfault-backend.politeriver-a25e3b65.westeurope.azurecontainerapps.io/auth/callback';
        const scope = 'openid email profile';

        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;

        window.location.href = googleAuthUrl;
    };

    const handleGuestLogin = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await authAPI.loginAsGuest();
            if (response.ok && response.token) {
                localStorage.setItem('authToken', response.token);
                localStorage.setItem('guestTokenId', response.guestTokenId);
                login(response.token);
                navigate('/dashboard');
            }
        } catch (err) {
            let errorMsg = 'Guest login failed. Please try again.';
            if (err instanceof AxiosError && err.response?.data && typeof err.response.data === 'object' && 'error' in err.response.data) {
                errorMsg = (err.response.data as { error?: string }).error || errorMsg;
            }
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // Custom TextField Styles for Dark Mode
    const textFieldSx = {
        mb: 2,
        '& .MuiOutlinedInput-root': {
            bgcolor: 'rgba(255, 255, 255, 0.03)',
            color: '#f8fafc',
            fontFamily: '"Geist Mono", monospace',
            fontSize: '0.9rem',
            '& fieldset': {
                borderColor: 'rgba(255, 255, 255, 0.1)',
            },
            '&:hover fieldset': {
                borderColor: 'rgba(255, 255, 255, 0.2)',
            },
            '&.Mui-focused fieldset': {
                borderColor: '#a78bfa',
            },
        },
        '& .MuiInputLabel-root': {
            color: '#64748b',
            '&.Mui-focused': {
                color: '#a78bfa',
            },
        },
        '& .MuiInputAdornment-root .MuiIconButton-root': {
            color: '#64748b',
        },
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#020617',
                color: '#f8fafc',
                position: 'relative',
                overflow: 'hidden',
                fontFamily: '"Geist Mono", "Inter", sans-serif',
            }}
        >
            {/* Background Grid Pattern */}
            <Box sx={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `
          linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
        `,
                backgroundSize: '32px 32px',
                maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
                zIndex: 0,
            }} />

            {/* Ambient Glow */}
            <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100vw',
                height: '100vh',
                background: 'radial-gradient(circle at center, rgba(124, 58, 237, 0.05) 0%, rgba(0,0,0,0) 60%)',
                zIndex: 0,
                pointerEvents: 'none'
            }} />

            <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
                <Fade in={true} timeout={600}>
                    <Box>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 4,
                                bgcolor: 'rgba(15, 23, 42, 0.6)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 3,
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                            }}
                        >
                            {step === 'login' ? (
                                <>
                                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                                        <Box
                                            sx={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: 48,
                                                height: 48,
                                                borderRadius: 2,
                                                bgcolor: 'rgba(124, 58, 237, 0.1)',
                                                color: '#a78bfa',
                                                mb: 2
                                            }}
                                        >
                                            <GuestIcon fontSize="medium" />
                                        </Box>
                                        <Typography variant="h5" component="h1" fontWeight={700} sx={{ color: '#f8fafc', mb: 1 }}>
                                            Welcome back
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                                            Enter your credentials to access the terminal
                                        </Typography>
                                    </Box>

                                    {error && (
                                        <Alert
                                            severity="error"
                                            sx={{
                                                mb: 3,
                                                bgcolor: 'rgba(239, 68, 68, 0.1)',
                                                color: '#fca5a5',
                                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                                '& .MuiAlert-icon': { color: '#fca5a5' }
                                            }}
                                            onClose={() => setError(null)}
                                        >
                                            {error}
                                        </Alert>
                                    )}

                                    <Box component="form" onSubmit={handleEmailLogin}>
                                        <TextField
                                            label="Email Address"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            fullWidth
                                            autoComplete="email"
                                            autoFocus
                                            sx={textFieldSx}
                                        />
                                        <TextField
                                            label="Password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            fullWidth
                                            autoComplete="current-password"
                                            sx={{ ...textFieldSx, mb: 3 }}
                                            InputProps={{
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <IconButton
                                                            aria-label="toggle password visibility"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            edge="end"
                                                            sx={{ color: '#64748b' }}
                                                        >
                                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                                        </IconButton>
                                                    </InputAdornment>
                                                ),
                                            }}
                                        />
                                        <Button
                                            type="submit"
                                            variant="contained"
                                            fullWidth
                                            size="large"
                                            disabled={loading}
                                            sx={{
                                                mb: 2,
                                                py: 1.5,
                                                bgcolor: '#f8fafc',
                                                color: '#020617',
                                                fontWeight: 600,
                                                textTransform: 'none',
                                                fontSize: '0.95rem',
                                                '&:hover': {
                                                    bgcolor: '#e2e8f0',
                                                }
                                            }}
                                        >
                                            {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                                        </Button>
                                    </Box>

                                    <Stack direction="row" justifyContent="center" sx={{ mb: 3 }}>
                                        <Link
                                            href="/forgot-password"
                                            underline="hover"
                                            sx={{ color: '#a78bfa', fontSize: '0.875rem', cursor: 'pointer' }}
                                        >
                                            Forgot Password?
                                        </Link>
                                    </Stack>

                                    <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }}>
                                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                                            OR CONTINUE WITH
                                        </Typography>
                                    </Divider>

                                    <Stack spacing={2}>
                                        <Button
                                            variant="outlined"
                                            fullWidth
                                            size="large"
                                            onClick={handleGoogleLogin}
                                            disabled={loading}
                                            startIcon={<GoogleIcon />}
                                            sx={{
                                                py: 1.25,
                                                borderColor: 'rgba(255,255,255,0.1)',
                                                color: '#cbd5e1',
                                                textTransform: 'none',
                                                '&:hover': {
                                                    borderColor: '#94a3b8',
                                                    bgcolor: 'rgba(255,255,255,0.03)',
                                                    color: '#f8fafc'
                                                },
                                            }}
                                        >
                                            Google
                                        </Button>

                                        <Button
                                            variant="outlined"
                                            fullWidth
                                            size="large"
                                            onClick={handleGuestLogin}
                                            disabled={loading}
                                            startIcon={<GuestIcon />}
                                            sx={{
                                                py: 1.25,
                                                borderColor: 'rgba(255,255,255,0.1)',
                                                color: '#cbd5e1',
                                                textTransform: 'none',
                                                '&:hover': {
                                                    borderColor: '#94a3b8',
                                                    bgcolor: 'rgba(255,255,255,0.03)',
                                                    color: '#f8fafc'
                                                },
                                            }}
                                        >
                                            Guest Access
                                        </Button>
                                    </Stack>

                                    <Box sx={{ textAlign: 'center', mt: 4 }}>
                                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                                            Don't have an account?{' '}
                                            <Link
                                                href="/register"
                                                underline="hover"
                                                sx={{ color: '#a78bfa', fontWeight: 600, cursor: 'pointer' }}
                                            >
                                                Register
                                            </Link>
                                        </Typography>
                                    </Box>
                                </>
                            ) : (
                                // 2FA Step
                                <>
                                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                                        <Box
                                            sx={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: 56,
                                                height: 56,
                                                borderRadius: '50%',
                                                bgcolor: 'rgba(16, 185, 129, 0.1)',
                                                color: '#10b981',
                                                mb: 3
                                            }}
                                        >
                                            <EmailIcon fontSize="large" />
                                        </Box>
                                        <Typography variant="h5" component="h1" fontWeight={700} sx={{ color: '#f8fafc', mb: 1 }}>
                                            Verify Email
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                                            We sent a 6-digit code to <br />
                                            <Box component="span" sx={{ color: '#f1f5f9', fontWeight: 600 }}>{email}</Box>
                                        </Typography>
                                    </Box>

                                    {error && (
                                        <Alert
                                            severity="error"
                                            sx={{
                                                mb: 3,
                                                bgcolor: 'rgba(239, 68, 68, 0.1)',
                                                color: '#fca5a5',
                                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                                '& .MuiAlert-icon': { color: '#fca5a5' }
                                            }}
                                            onClose={() => setError(null)}
                                        >
                                            {error}
                                        </Alert>
                                    )}

                                    <Box component="form" onSubmit={handleVerify2FA}>
                                        <TextField
                                            label="Verification Code"
                                            type="text"
                                            value={twoFaCode}
                                            onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            required
                                            fullWidth
                                            autoFocus
                                            placeholder="123456"
                                            sx={{
                                                ...textFieldSx,
                                                '& input': {
                                                    textAlign: 'center',
                                                    letterSpacing: '0.5em',
                                                    fontWeight: 700,
                                                    fontSize: '1.25rem'
                                                }
                                            }}
                                        />

                                        <Button
                                            type="submit"
                                            variant="contained"
                                            fullWidth
                                            size="large"
                                            disabled={loading}
                                            sx={{
                                                mb: 3,
                                                py: 1.5,
                                                mt: 2,
                                                bgcolor: '#10b981',
                                                color: '#020617',
                                                fontWeight: 600,
                                                textTransform: 'none',
                                                fontSize: '0.95rem',
                                                '&:hover': {
                                                    bgcolor: '#059669',
                                                }
                                            }}
                                        >
                                            {loading ? <CircularProgress size={24} color="inherit" /> : 'Verify & Login'}
                                        </Button>
                                    </Box>

                                    <Box sx={{ textAlign: 'center' }}>
                                        <Button
                                            onClick={() => setStep('login')}
                                            sx={{
                                                color: '#64748b',
                                                textTransform: 'none',
                                                '&:hover': { color: '#94a3b8', bgcolor: 'transparent' }
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </Box>
                                </>
                            )}
                        </Paper>

                        <Box sx={{ textAlign: 'center', mt: 4 }}>
                            <Button
                                startIcon={<ArrowBackIcon />}
                                onClick={() => navigate('/')}
                                sx={{
                                    color: '#64748b',
                                    textTransform: 'none',
                                    '&:hover': { color: '#94a3b8', bgcolor: 'transparent' }
                                }}
                            >
                                Back to Home
                            </Button>
                        </Box>
                    </Box>
                </Fade>
            </Container>
        </Box>
    );
};

export default Login;

