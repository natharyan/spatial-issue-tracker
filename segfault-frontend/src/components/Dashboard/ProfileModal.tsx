import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Tabs,
    Tab,
    Box,
    Typography,
    Avatar,
    Paper,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Chip,
    CircularProgress,
    IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { userRoutes } from '../../api/routes';
import type { UserProfile, UserIssue, UserComment } from '../../api/routes';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

interface ProfileModalProps {
    open: boolean;
    onClose: () => void;
    onIssueClick?: (issueId: string) => void;
}

const ProfileModal = ({ open, onClose, onIssueClick }: ProfileModalProps) => {
    const [tab, setTab] = useState(0);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [issues, setIssues] = useState<UserIssue[]>([]);
    const [comments, setComments] = useState<UserComment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (open) {
            setLoading(true);
            Promise.all([
                userRoutes.getMe().catch(() => null),
                userRoutes.getMyIssues().catch(() => []),
                userRoutes.getMyComments().catch(() => [])
            ]).then(([p, i, c]) => {
                setProfile(p);
                setIssues(i as UserIssue[]);
                setComments(c as UserComment[]);
                setLoading(false);
            });
        }
    }, [open]);

    const handleIssueClick = (id: string) => {
        onClose();
        if (onIssueClick) {
            onIssueClick(id);
        }
    };

    if (!profile && !loading) {
        return (
            <Dialog open={open} onClose={onClose}>
                <DialogContent>Failed to load profile.</DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6">User Profile</Typography>
                <IconButton onClick={onClose}><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0, minHeight: 400 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
                            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                                <Tab label="Overview" />
                                <Tab label={`My Issues (${issues.length})`} />
                                <Tab label={`My Comments (${comments.length})`} />
                            </Tabs>
                        </Box>

                        <Box sx={{ p: 3 }}>
                            {/* Overview Tab */}
                            {tab === 0 && profile && (
                                <Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                                        <Avatar
                                            src={profile.picture || undefined}
                                            sx={{ width: 80, height: 80, mr: 3, fontSize: '2rem' }}
                                        >
                                            {profile.name?.charAt(0) || profile.email.charAt(0)}
                                        </Avatar>
                                        <Box>
                                            <Typography variant="h5" fontWeight="bold">
                                                {profile.name || "Anonymous User"}
                                            </Typography>
                                            <Typography variant="body1" color="text.secondary">
                                                {profile.email}
                                            </Typography>
                                            <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                                                <Chip label={profile.role} size="small" color="primary" variant="outlined" />
                                                <Chip
                                                    icon={<EmojiEventsIcon />}
                                                    label={`${profile.stats.points} Points`}
                                                    size="small"
                                                    color="secondary"
                                                />
                                            </Box>
                                        </Box>
                                    </Box>

                                    <Typography variant="h6" gutterBottom>Statistics</Typography>
                                    <Typography variant="h6" gutterBottom>Statistics</Typography>
                                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 4 }}>
                                        <Box sx={{ flex: '1 1 200px' }}>
                                            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'background.default' }}>
                                                <Typography variant="h4" color="primary.main">{profile.stats.issuesReported}</Typography>
                                                <Typography variant="body2" color="text.secondary">Issues Reported</Typography>
                                            </Paper>
                                        </Box>
                                        <Box sx={{ flex: '1 1 200px' }}>
                                            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'background.default' }}>
                                                <Typography variant="h4" color="secondary.main">{profile.stats.commentsPosted}</Typography>
                                                <Typography variant="body2" color="text.secondary">Comments Posted</Typography>
                                            </Paper>
                                        </Box>
                                    </Box>

                                    <Typography variant="h6" gutterBottom>Badges</Typography>
                                    {profile.badges.length > 0 ? (
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                            {profile.badges.map(b => (
                                                <Chip key={b.id} label={b.name} color="success" />
                                            ))}
                                        </Box>
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">No badges earned yet.</Typography>
                                    )}
                                </Box>
                            )}

                            {/* Issues Tab */}
                            {tab === 1 && (
                                <List>
                                    {issues.length === 0 ? <Typography color="text.secondary">No issues reported.</Typography> : null}
                                    {issues.map(issue => (
                                        <ListItemButton
                                            key={issue.id}
                                            onClick={() => handleIssueClick(issue.id)}
                                            sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
                                        >
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Typography variant="subtitle1" component="span">{issue.title}</Typography>
                                                        <Chip label={issue.status} size="small" color={issue.status === 'RESOLVED' ? 'success' : 'warning'} />
                                                    </Box>
                                                }
                                                secondary={`${new Date(issue.reportedAt).toLocaleDateString()} • ${issue.voteCount} votes • ${issue.commentCount} comments`}
                                            />
                                        </ListItemButton>
                                    ))}
                                </List>
                            )}

                            {/* Comments Tab */}
                            {tab === 2 && (
                                <List>
                                    {comments.length === 0 ? <Typography color="text.secondary">No comments posted.</Typography> : null}
                                    {comments.map(comment => (
                                        <ListItem key={comment.id} sx={{ borderBottom: '1px solid', borderColor: 'divider', display: 'block' }}>
                                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                                On <b>{comment.issueTitle}</b> • {new Date(comment.createdAt).toLocaleDateString()}
                                            </Typography>
                                            <Typography variant="body1">{comment.content}</Typography>
                                            <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                                                {comment.upvoteCount} upvotes
                                            </Typography>
                                        </ListItem>
                                    ))}
                                </List>
                            )}
                        </Box>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default ProfileModal;
