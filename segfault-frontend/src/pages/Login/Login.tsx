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
    Stack
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    Google as GoogleIcon,
    PersonOutline as GuestIcon,
    ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { authAPI } from '../../api/axios';
import { AxiosError } from 'axios';
import { useAuth } from '../../state/authContext';

const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const result = await authAPI.login(email, password);
            if (result.token) {
                localStorage.setItem('authToken', result.token);
                login(result.token);
            }
            navigate('/dashboard');
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

    const handleGoogleLogin = () => {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${apiUrl}/auth/callback`;
        const scope = 'openid email profile';

        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;

        window.location.href = googleAuthUrl;
    };

    const handleGuestLogin = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await authAPI.loginAsGuest();
            if (response.ok) {
                localStorage.setItem('guestTokenId', response.guestTokenId);
                login(response.guestTokenId);
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
            </Container>
        </Box>
    );
};

export default Login;

