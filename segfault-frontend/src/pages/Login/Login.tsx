import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  IconButton,
  InputAdornment,
  Link,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Google as GoogleIcon,
  PersonOutline as GuestIcon,
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
    // Redirect to Google OAuth flow
    // The backend will handle the OAuth callback and redirect back to frontend
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

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'grey.100',
        py: 4,
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        <Card elevation={3} sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
                Welcome Back
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Sign in to track your civic reports
              </Typography>
            </Box>

            
            {error && (
              <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
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
                sx={{ mb: 2 }}
                autoComplete="email"
                autoFocus
              />
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                sx={{ mb: 3 }}
                autoComplete="current-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
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
                color="primary"
                fullWidth
                size="large"
                disabled={loading}
                sx={{ mb: 2, py: 1.5 }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
              </Button>
            </Box>

            
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Link
                href="/forgot-password"
                underline="hover"
                color="primary"
                sx={{ cursor: 'pointer' }}
              >
                Forgot Password?
              </Link>
            </Box>

            
            <Divider sx={{ my: 3 }}>
              <Typography variant="body2" color="text.secondary">
                OR
              </Typography>
            </Divider>

            
            <Button
              variant="outlined"
              fullWidth
              size="large"
              onClick={handleGoogleLogin}
              disabled={loading}
              startIcon={<GoogleIcon />}
              sx={{
                mb: 2,
                py: 1.5,
                borderColor: 'grey.300',
                color: 'text.primary',
                '&:hover': {
                  borderColor: 'grey.400',
                  backgroundColor: 'grey.50',
                },
              }}
            >
              Sign in with Google
            </Button>

            
            <Button
              variant="outlined"
              fullWidth
              size="large"
              onClick={handleGuestLogin}
              disabled={loading}
              startIcon={<GuestIcon />}
              color="secondary"
              sx={{
                py: 1.5,
                borderWidth: 2,
                '&:hover': {
                  borderWidth: 2,
                },
              }}
            >
              Continue as Guest
            </Button>

            
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', textAlign: 'center', mt: 1 }}
            >
              Report issues anonymously without creating an account
            </Typography>

            
            <Box sx={{ textAlign: 'center', mt: 4 }}>
              <Typography variant="body2" color="text.secondary">
                Don't have an account?{' '}
                <Link
                  href="/register"
                  underline="hover"
                  color="primary"
                  fontWeight={600}
                  sx={{ cursor: 'pointer' }}
                >
                  Register
                </Link>
              </Typography>
            </Box>
          </CardContent>
        </Card>

        
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Link
            component="button"
            variant="body2"
            onClick={() => navigate('/')}
            underline="hover"
            color="text.secondary"
          >
            ← Back to Home
          </Link>
        </Box>
      </Container>
    </Box>
  );
};

export default Login;
