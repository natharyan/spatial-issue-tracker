import { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Chip,
  Divider,
  Button,
  TextField,
  Avatar,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { issueRoutes, commentRoutes, type Issue, type Comment } from '../../api/routes';
import { useAuth } from '../../state/authContext';
import UserBadge from '../Shared/UserBadge';

interface IssueDetailPageProps {
  open: boolean;
  onClose: () => void;
  issueId: string | null;
}

const IssueDetailPage = ({ open, onClose, issueId }: IssueDetailPageProps) => {
  const { isGuest } = useAuth();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (open && issueId) {
      fetchIssueDetails();
    } else {
      setIssue(null);
      setComments([]);
      setError(null);
    }
  }, [open, issueId]);

  const fetchIssueDetails = async () => {
    if (!issueId) return;

    try {
      setLoading(true);
      setError(null);

      const [issueData, commentsData] = await Promise.all([
        issueRoutes.getIssueById(issueId),
        commentRoutes.getComments(issueId),
      ]);

      setIssue(issueData);
      setComments(commentsData);
      setVoteCount(issueData.voteCount || 0);
      setHasVoted((issueData as unknown as { hasVoted?: boolean }).hasVoted || false);
    } catch (err) {
      console.error('Failed to fetch issue details:', err);
      setError('Failed to load issue details');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async () => {
    if (!issueId || isGuest) return;

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const result = await issueRoutes.voteOnIssue(issueId, {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setVoteCount(result.voteCount);
          setHasVoted(result.hasVoted);
        } catch (err: any) {
          const msg = err?.response?.data?.error || 'Failed to vote';
          alert(msg);
        }
      },
      (err) => {
        alert('Location access is required to verify you are an affected user.');
        console.error('Geolocation error:', err);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmitComment = async () => {
    if (!issueId || !newComment.trim() || isGuest) return;

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          setSubmittingComment(true);
          const comment = await commentRoutes.addComment(issueId, newComment.trim(), {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setComments((prev) => [...prev, comment]);
          setNewComment('');
        } catch (err: any) {
          const msg = err?.response?.data?.error || 'Failed to submit comment';
          alert(msg);
        } finally {
          setSubmittingComment(false);
        }
      },
      (err) => {
        alert('Location access is required to verify you are an affected user.');
        console.error('Geolocation error:', err);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleUpvoteComment = async (commentId: string) => {
    if (isGuest) return;

    try {
      const result = await commentRoutes.upvoteComment(commentId);
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, upvoteCount: result.upvoteCount, hasUpvoted: result.hasUpvoted }
            : c
        )
      );
    } catch (err) {
      console.error('Failed to upvote comment:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'warning';
      case 'in_progress':
        return 'info';
      case 'resolved':
        return 'success';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMins > 0) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 420 },
          p: 0,
        },
      }}
    >
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'primary.main',
          color: 'white',
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          Issue Details
        </Typography>
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ p: 3, overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : issue ? (
          <>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              {issue.title}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Chip
                label={issue.status?.replace('_', ' ')}
                color={getStatusColor(issue.status)}
                size="small"
              />
              <Chip label={issue.type} size="small" variant="outlined" />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, color: 'text.secondary' }}>
              <LocationOnIcon sx={{ fontSize: 18, mr: 0.5 }} />
              <Typography variant="body2">{issue.location}</Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, color: 'text.secondary' }}>
              <AccessTimeIcon sx={{ fontSize: 18, mr: 0.5 }} />
              <Typography variant="body2">Reported on {formatDate(issue.reportedAt)}</Typography>
            </Box>

            <Typography variant="body1" sx={{ mb: 3 }}>
              {issue.description}
            </Typography>

            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'grey.100',
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="h4" fontWeight={700} sx={{ mr: 1 }}>
                  {voteCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  people find this important
                </Typography>
              </Box>
              <Button
                variant={hasVoted ? 'contained' : 'outlined'}
                color="primary"
                startIcon={hasVoted ? <ThumbUpIcon /> : <ThumbUpOutlinedIcon />}
                onClick={handleVote}
                disabled={isGuest}
              >
                {hasVoted ? 'Voted' : 'Vote'}
              </Button>
            </Paper>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" fontWeight={600} gutterBottom>
              Comments ({comments.length})
            </Typography>

            {comments.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                No comments yet. Be the first to comment!
              </Typography>
            ) : (
              comments.map((comment) => (
                <Box key={comment.id} sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>
                    {comment.author.name[0]}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                      <Typography variant="body2" fontWeight={600}>
                        {comment.author.name}
                      </Typography>
                      {comment.author.credibility !== undefined && (
                        <UserBadge
                          score={comment.author.credibility}
                          badges={comment.author.badges || []}
                          compact
                        />
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {formatTimeAgo(comment.createdAt)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      {comment.content}
                    </Typography>
                    <Button
                      size="small"
                      startIcon={
                        comment.hasUpvoted ? (
                          <ThumbUpIcon fontSize="small" />
                        ) : (
                          <ThumbUpOutlinedIcon fontSize="small" />
                        )
                      }
                      onClick={() => handleUpvoteComment(comment.id)}
                      disabled={isGuest}
                      sx={{ minWidth: 'auto', p: 0.5 }}
                    >
                      {comment.upvoteCount}
                    </Button>
                  </Box>
                </Box>
              ))
            )}

            <Box sx={{ mt: 3 }}>
              {isGuest ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Sign in to comment and vote
                </Alert>
              ) : (
                <>
                  <TextField
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    fullWidth
                    multiline
                    rows={2}
                    sx={{ mb: 1 }}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    disabled={!newComment.trim() || submittingComment}
                    onClick={handleSubmitComment}
                  >
                    {submittingComment ? 'Posting...' : 'Post Comment'}
                  </Button>
                </>
              )}
            </Box>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Select an issue to view details
          </Typography>
        )}
      </Box>
    </Drawer>
  );
};

export default IssueDetailPage;
