import { Box, Paper, Typography } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ReplayIcon from "@mui/icons-material/Replay";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";

interface PersonalImpact {
    issuesReported: number;
    issuesResolved: number;
    resolutionRate: number;
}

interface CommunityHealth {
    avgResolutionTimeHours: number;
    reopenRate: number;
    totalActiveIssues: number;
}

interface StatsGridProps {
    personalImpact: PersonalImpact | null;
    communityHealth: CommunityHealth;
}

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color?: string;
    warning?: boolean;
}

const StatCard = ({ title, value, subtitle, icon, color = "#3b82f6", warning }: StatCardProps) => (
    <Paper
        elevation={0}
        sx={{
            p: 2.5,
            height: "100%",
            borderRadius: 2,
            borderLeft: `4px solid ${warning ? "#ef4444" : color}`,
            bgcolor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderLeftWidth: '4px',
            backdropFilter: 'blur(10px)',
            transition: "transform 0.2s, box-shadow 0.2s",
            "&:hover": {
                transform: "translateY(-2px)",
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            },
        }}
    >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <Box>
                <Typography variant="caption" sx={{ textTransform: "uppercase", letterSpacing: 0.5, color: '#94a3b8' }}>
                    {title}
                </Typography>
                <Typography variant="h4" fontWeight={700} sx={{ color: warning ? "#ef4444" : "#f8fafc", mt: 0.5 }}>
                    {value}
                </Typography>
                {subtitle && (
                    <Typography variant="body2" sx={{ mt: 0.5, color: '#64748b' }}>
                        {subtitle}
                    </Typography>
                )}
            </Box>
            <Box sx={{ color: warning ? "#ef4444" : color, opacity: 0.9 }}>
                {icon}
            </Box>
        </Box>
    </Paper>
);

const StatsGrid = ({ personalImpact, communityHealth }: StatsGridProps) => {
    return (
        <Box sx={{ mb: 3 }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: '#f8fafc' }}>
                Dashboard Metrics
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                {personalImpact && (
                    <>
                        <Box sx={{ flex: "1 1 calc(25% - 16px)", minWidth: 200 }}>
                            <StatCard
                                title="Issues Reported"
                                value={personalImpact.issuesReported}
                                subtitle="by you"
                                icon={<ReportProblemIcon sx={{ fontSize: 32 }} />}
                                color="#8b5cf6"
                            />
                        </Box>
                        <Box sx={{ flex: "1 1 calc(25% - 16px)", minWidth: 200 }}>
                            <StatCard
                                title="Resolution Rate"
                                value={`${personalImpact.resolutionRate}%`}
                                subtitle={`${personalImpact.issuesResolved} resolved`}
                                icon={<TrendingUpIcon sx={{ fontSize: 32 }} />}
                                color="#22c55e"
                            />
                        </Box>
                    </>
                )}
                <Box sx={{ flex: personalImpact ? "1 1 calc(25% - 16px)" : "1 1 calc(33% - 16px)", minWidth: 200 }}>
                    <StatCard
                        title="Avg Fix Time"
                        value={communityHealth.avgResolutionTimeHours < 24
                            ? `${communityHealth.avgResolutionTimeHours}h`
                            : `${Math.round(communityHealth.avgResolutionTimeHours / 24)}d`}
                        subtitle="community average"
                        icon={<AccessTimeIcon sx={{ fontSize: 32 }} />}
                        color="#f59e0b"
                    />
                </Box>
                <Box sx={{ flex: personalImpact ? "1 1 calc(25% - 16px)" : "1 1 calc(33% - 16px)", minWidth: 200 }}>
                    <StatCard
                        title="Reopen Rate"
                        value={`${communityHealth.reopenRate}%`}
                        subtitle={communityHealth.reopenRate > 10 ? "low accountability" : "healthy"}
                        icon={<ReplayIcon sx={{ fontSize: 32 }} />}
                        warning={communityHealth.reopenRate > 10}
                    />
                </Box>
                <Box sx={{ flex: personalImpact ? "1 1 calc(20% - 16px)" : "1 1 calc(33% - 16px)", minWidth: 200 }}>
                    <StatCard
                        title="Active Issues"
                        value={communityHealth.totalActiveIssues}
                        subtitle="awaiting resolution"
                        icon={<ReportProblemIcon sx={{ fontSize: 32 }} />}
                        color="#ef4444"
                    />
                </Box>
            </Box>
        </Box>
    );
};

export default StatsGrid;
