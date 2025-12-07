import { Box, Tooltip, Typography, Chip } from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import ShieldIcon from "@mui/icons-material/Shield";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import VisibilityIcon from "@mui/icons-material/Visibility";

interface UserBadgeProps {
    score: number;
    badges: string[];
    compact?: boolean;
}

const BADGE_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    Observer: {
        icon: <VisibilityIcon sx={{ fontSize: 16 }} />,
        color: "#cd7f32",
        label: "Observer (10+ pts)",
    },
    Activist: {
        icon: <ShieldIcon sx={{ fontSize: 16 }} />,
        color: "#c0c0c0",
        label: "Activist (100+ pts)",
    },
    Guardian: {
        icon: <EmojiEventsIcon sx={{ fontSize: 16 }} />,
        color: "#ffd700",
        label: "Guardian (500+ pts)",
    },
};

const UserBadge = ({ score, badges, compact = false }: UserBadgeProps) => {
    const highestBadge = [...badges].reverse()[0];
    const badgeConfig = highestBadge ? BADGE_CONFIG[highestBadge] : null;

    if (compact) {
        return (
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                {badgeConfig && (
                    <Tooltip title={badgeConfig.label}>
                        <Box sx={{ color: badgeConfig.color, display: "flex", alignItems: "center" }}>
                            {badgeConfig.icon}
                        </Box>
                    </Tooltip>
                )}
                <Typography variant="caption" color="text.secondary">
                    {score} pts
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Chip
                icon={<StarIcon sx={{ fontSize: 16 }} />}
                label={`${score} pts`}
                size="small"
                variant="outlined"
                sx={{ fontSize: "0.75rem" }}
            />
            {badges.map((badge) => {
                const config = BADGE_CONFIG[badge];
                if (!config) return null;
                return (
                    <Tooltip key={badge} title={config.label}>
                        <Chip
                            icon={<Box sx={{ color: config.color }}>{config.icon}</Box>}
                            label={badge}
                            size="small"
                            sx={{
                                fontSize: "0.75rem",
                                borderColor: config.color,
                                "& .MuiChip-icon": { color: config.color },
                            }}
                            variant="outlined"
                        />
                    </Tooltip>
                );
            })}
        </Box>
    );
};

export default UserBadge;
