import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Container,
    Typography,
    Stack,
    Paper,
    useMediaQuery,
    useTheme,
    Chip
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import {
    Map as MapIcon,
    Security as SecurityIcon,
    TrendingUp as TrendingUpIcon,
    ArrowForward as ArrowIcon,
    EmojiEvents as TrophyIcon,
    Public as PublicIcon
} from '@mui/icons-material';

const Landing = () => {
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const handleLogin = () => navigate('/login');
    const handleGuest = () => navigate('/dashboard');

    return (
        <Box
            sx={{
                minHeight: '100vh',
                width: '100%',
                bgcolor: '#020617',
                color: '#f8fafc',
                overflowX: 'hidden',
                position: 'relative',
                fontFamily: '"Geist Mono", "Inter", sans-serif',
            }}
        >
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

            <Box sx={{
                position: 'absolute',
                top: '-15%',
                right: '-5%',
                width: '40vw',
                height: '40vw',
                background: 'radial-gradient(circle, rgba(124, 58, 237, 0.08) 0%, rgba(0,0,0,0) 70%)', // Violet glow
                filter: 'blur(80px)',
                zIndex: 0,
                pointerEvents: 'none'
            }} />
            <Box sx={{
                position: 'absolute',
                bottom: '-10%',
                left: '-10%',
                width: '50vw',
                height: '50vw',
                background: 'radial-gradient(circle, rgba(13, 148, 136, 0.06) 0%, rgba(0,0,0,0) 70%)', // Teal glow
                filter: 'blur(80px)',
                zIndex: 0,
                pointerEvents: 'none'
            }} />

            <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, pt: 3, pb: 8 }}>

                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: { xs: 8, md: 12 } }}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box sx={{
                            color: '#a78bfa',
                            bgcolor: 'rgba(167, 139, 250, 0.1)',
                            p: 0.5,
                            borderRadius: 1,
                            display: 'flex'
                        }}>
                            <PublicIcon fontSize="small" />
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, letterSpacing: -0.5, color: '#f1f5f9' }}>
                            segfault<Box component="span" sx={{ color: '#64748b', fontWeight: 400 }}>tracker</Box>
                        </Typography>
                    </Stack>
                    <Button
                        variant="text"
                        onClick={handleLogin}
                        sx={{
                            color: '#94a3b8',
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: '0.95rem',
                            '&:hover': { color: '#f8fafc', bgcolor: 'transparent' }
                        }}
                    >
                        Log in
                    </Button>
                </Stack>

                <Grid container spacing={{ xs: 6, md: 4 }} alignItems="center">
                    <Grid xs={12} md={7}>
                        <Box sx={{ mb: 3 }}>
                            <Chip
                                label="v1.0 Public Beta"
                                size="small"
                                sx={{
                                    bgcolor: 'rgba(124, 58, 237, 0.1)',
                                    color: '#a78bfa',
                                    border: '1px solid rgba(124, 58, 237, 0.2)',
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                    height: 24
                                }}
                            />
                        </Box>

                        <Typography
                            variant={isMobile ? "h3" : "h1"}
                            sx={{
                                fontWeight: 800,
                                mb: 3,
                                lineHeight: 1.1,
                                letterSpacing: -1.5,
                                background: 'linear-gradient(to right bottom, #ffffff, #cbd5e1)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                fontSize: { xs: '2.5rem', md: '4rem' }
                            }}
                        >
                            Resolve civic issues <br />
                            with full transparency.
                        </Typography>

                        <Typography variant="h6" sx={{ color: '#94a3b8', mb: 5, maxWidth: '540px', fontWeight: 400, lineHeight: 1.6, fontSize: '1.125rem' }}>
                            A decentralized, AI-moderated platform for crowd-sourced civic issue tracking.
                            Report hazards, verify fixes, and earn reputation on the chain.
                        </Typography>

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <Button
                                variant="contained"
                                size="large"
                                onClick={handleLogin}
                                sx={{
                                    bgcolor: '#f8fafc',
                                    color: '#0f172a',
                                    px: 3,
                                    py: 1.5,
                                    fontWeight: 600,
                                    fontSize: '0.95rem',
                                    textTransform: 'none',
                                    borderRadius: 2,
                                    boxShadow: '0 0 0 1px rgba(255,255,255,0.1)',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        bgcolor: '#e2e8f0',
                                        transform: 'translateY(-1px)',
                                        boxShadow: '0 4px 12px rgba(255,255,255,0.1)'
                                    }
                                }}
                                endIcon={<ArrowIcon />}
                            >
                                Start Reporting
                            </Button>
                            <Button
                                variant="outlined"
                                size="large"
                                onClick={handleGuest}
                                sx={{
                                    borderColor: '#334155',
                                    color: '#cbd5e1',
                                    px: 3,
                                    py: 1.5,
                                    fontWeight: 500,
                                    fontSize: '0.95rem',
                                    textTransform: 'none',
                                    borderRadius: 2,
                                    backdropFilter: 'blur(8px)',
                                    '&:hover': {
                                        borderColor: '#94a3b8',
                                        color: '#f8fafc',
                                        bgcolor: 'rgba(255,255,255,0.03)'
                                    }
                                }}
                            >
                                Explore Map
                            </Button>
                        </Stack>
                    </Grid>

                    <Grid xs={12} md={5} sx={{ display: { xs: 'none', md: 'block' }, position: 'relative' }}>
                        <Box
                            sx={{
                                height: '500px',
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                perspective: '1000px'
                            }}
                        >
                            <Paper
                                elevation={24}
                                sx={{
                                    position: 'absolute',
                                    top: 60,
                                    right: 30,
                                    width: 280,
                                    p: 3,
                                    bgcolor: 'rgba(15, 23, 42, 0.6)',
                                    backdropFilter: 'blur(16px)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: 3,
                                    transform: 'rotate(3deg) translateZ(20px)',
                                    zIndex: 2,
                                    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)'
                                }}
                            >
                                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                                    <Chip label="High Severity" size="small" sx={{ bgcolor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontSize: '0.7rem', height: 20, border: '1px solid rgba(239, 68, 68, 0.2)' }} />
                                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#64748b' }}>#4092</Typography>
                                </Stack>
                                <Typography variant="subtitle1" fontWeight={600} gutterBottom>Structural Damage</Typography>
                                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                                    <Box sx={{ width: 4, borderRadius: 4, bgcolor: '#ef4444' }} />
                                    <Typography variant="body2" color="#94a3b8" sx={{ fontSize: '0.85rem' }}>
                                        Reported on Main St. <br />
                                        AI Verification: 98%
                                    </Typography>
                                </Stack>
                                <Box sx={{ width: '100%', height: 4, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                                    <Box sx={{ width: '75%', height: '100%', bgcolor: '#ef4444' }} />
                                </Box>
                            </Paper>

                            <Paper
                                elevation={4}
                                sx={{
                                    position: 'absolute',
                                    bottom: 60,
                                    left: 30,
                                    width: 260,
                                    p: 3,
                                    bgcolor: 'rgba(15, 23, 42, 0.4)',
                                    backdropFilter: 'blur(12px)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    borderRadius: 3,
                                    transform: 'rotate(-4deg)',
                                    zIndex: 1,
                                    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)'
                                }}
                            >
                                <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
                                    <Box sx={{ p: 0.5, bgcolor: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', color: '#34d399' }}>
                                        <SecurityIcon sx={{ fontSize: 16 }} />
                                    </Box>
                                    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, letterSpacing: 0.5 }}>STATUS: SECURE</Typography>
                                </Stack>
                                <Typography variant="h4" fontWeight={700} sx={{ color: '#f8fafc' }}>1,284</Typography>
                                <Typography variant="body2" sx={{ color: '#64748b' }}>Verified resolutions this week</Typography>
                            </Paper>
                        </Box>
                    </Grid>
                </Grid>

                <Grid container spacing={3} sx={{ mt: { xs: 8, md: 16 } }}>
                    <FeatureCard
                        icon={<MapIcon sx={{ fontSize: 24, color: '#38bdf8' }} />}
                        title="Real-time Mapping"
                        desc="Interactive vector maps with live clustering and WebGL rendering for massive datasets."
                    />
                    <FeatureCard
                        icon={<SecurityIcon sx={{ fontSize: 24, color: '#f472b6' }} />}
                        title="AI Moderation"
                        desc="Automated image analysis pipeline using Google Gemini to filter spam and verify reports."
                    />
                    <FeatureCard
                        icon={<TrendingUpIcon sx={{ fontSize: 24, color: '#34d399' }} />}
                        title="Shortest Path"
                        desc="Hazard-aware routing engine that calculates safety scores for every street segment."
                    />
                    <FeatureCard
                        icon={<TrophyIcon sx={{ fontSize: 24, color: '#fbbf24' }} />}
                        title="The Reputation Game"
                        desc="Gamified contribution system. Earn badges and voting power by improving your city."
                    />
                </Grid>

                {/* <Box sx={{ mt: 16, pt: 8, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                    <Typography variant="caption" sx={{ color: '#475569' }}>
                        © 2025 Segfault Inc. Open Source.
                    </Typography>
                    <Stack direction="row" spacing={3}>
                        {['Privacy', 'Terms', 'GitHub', 'Contact'].map((item) => (
                            <Typography key={item} variant="caption" sx={{ color: '#64748b', cursor: 'pointer', '&:hover': { color: '#94a3b8' } }}>
                                {item}
                            </Typography>
                        ))}
                    </Stack>
                </Box> */}

            </Container>
        </Box>
    );
};

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
    <Grid xs={12} sm={6} md={3}>
        <Paper
            elevation={0}
            sx={{
                p: 3,
                height: '100%',
                bgcolor: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.02)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    transform: 'translateY(-2px)'
                }
            }}
        >
            <Box sx={{
                mb: 2,
                width: 48,
                height: 48,
                bgcolor: 'rgba(255,255,255,0.03)',
                borderRadius: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255,255,255,0.05)'
            }}>
                {icon}
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: '#f1f5f9' }}>{title}</Typography>
            <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.6 }}>{desc}</Typography>
        </Paper>
    </Grid>
);

export default Landing;