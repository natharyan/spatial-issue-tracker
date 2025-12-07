import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SearchIcon from '@mui/icons-material/Search';
import SortIcon from '@mui/icons-material/Sort';
import { issueRoutes, type Issue } from '../../api/routes';
import { useAuth } from '../../state/authContext';

interface IssuesListProps {
  onIssueClick?: (issueId: string) => void;
}

const ISSUE_TYPES = [
  'POTHOLE', 'ROAD_DAMAGE', 'STREETLIGHT_FAULT', 'GARBAGE_UNCOLLECTED',
  'ILLEGAL_DUMPING', 'DRAINAGE_BLOCKED', 'SEWAGE_OVERFLOW', 'WATER_SUPPLY_ISSUE',
  'LOW_WATER_PRESSURE', 'OPEN_MANHOLE', 'BROKEN_FOOTPATH', 'ILLEGAL_ENCROACHMENT',
  'STRAY_CATTLE', 'TREE_FALL', 'TRAFFIC_LIGHT_FAULT', 'MOSQUITO_BREEDING',
  'NOISE_COMPLAINT', 'BUILDING_SAFETY',
];

const IssuesList = ({ onIssueClick }: IssuesListProps) => {
  const { user, isGuest } = useAuth();
  const isGov = user?.isGov || false;

  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'votes' | 'date' | 'location'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchIssues();
  }, [typeFilter, statusFilter]);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters: Record<string, string> = {};
      if (typeFilter) filters.type = typeFilter;
      if (statusFilter) filters.status = statusFilter;
      const data = await issueRoutes.getIssues(filters);
      setIssues(data);
    } catch (err) {
      console.error('Failed to fetch issues:', err);
      setError('Failed to load issues');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (issueId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGuest) return;

    // Get user's location for geofencing
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
          setIssues(prev => prev.map(issue =>
            issue.id === issueId
              ? { ...issue, voteCount: result.voteCount }
              : issue
          ));
        } catch (err: any) {
          const msg = err?.response?.data?.error || 'Failed to vote';
          alert(msg);
        }
      },
      (err) => {
        alert('Location access is required to verify you are an affected user. Please enable it and try again.');
        console.error('Geolocation error:', err);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleMarkResolved = async (issueId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isGov) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/issues/${issueId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ status: 'RESOLVED' }),
        credentials: 'include',
      });
      fetchIssues();
    } catch (err) {
      console.error('Failed to mark resolved:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'warning';
      case 'in_progress': return 'info';
      case 'resolved': return 'success';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const filteredAndSortedIssues = issues
    .filter(issue => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          issue.title.toLowerCase().includes(query) ||
          issue.description?.toLowerCase().includes(query) ||
          issue.location?.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'votes') {
        comparison = (b.voteCount || 0) - (a.voteCount || 0);
      } else if (sortBy === 'date') {
        comparison = new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime();
      }
      return sortOrder === 'asc' ? -comparison : comparison;
    });

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      {/* Filters Bar */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search issues..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 200, flex: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Type</InputLabel>
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} label="Type">
            <MenuItem value="">All Types</MenuItem>
            {ISSUE_TYPES.map(type => (
              <MenuItem key={type} value={type}>{type.replace(/_/g, ' ')}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status">
            <MenuItem value="">All</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Sort</InputLabel>
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} label="Sort">
            <MenuItem value="date">Date</MenuItem>
            <MenuItem value="votes">Votes</MenuItem>
          </Select>
        </FormControl>
        <IconButton onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')} size="small">
          <SortIcon sx={{ transform: sortOrder === 'asc' ? 'scaleY(-1)' : 'none' }} />
        </IconButton>
      </Box>

      {/* Gov Badge */}
      {isGov && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>Government Official Mode:</strong> You can mark issues as resolved directly.
        </Alert>
      )}

      {/* Issues List */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : filteredAndSortedIssues.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={4}>
            No issues found
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filteredAndSortedIssues.map((issue) => (
              <Card
                key={issue.id}
                elevation={2}
                onClick={() => onIssueClick?.(issue.id)}
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
                        {issue.title}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                        <Chip
                          label={issue.status?.replace('_', ' ')}
                          size="small"
                          color={getStatusColor(issue.status) as any}
                        />
                        <Chip label={issue.type?.replace(/_/g, ' ')} size="small" variant="outlined" />
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {isGov ? (
                        <Tooltip title="Mark as Resolved">
                          <IconButton
                            color="success"
                            onClick={(e) => handleMarkResolved(issue.id, e)}
                            disabled={issue.status === 'RESOLVED'}
                          >
                            <CheckCircleIcon />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title={isGuest ? 'Sign in to vote' : 'Upvote'}>
                          <IconButton
                            color="primary"
                            onClick={(e) => handleVote(issue.id, e)}
                            disabled={isGuest}
                          >
                            <ThumbUpOutlinedIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Typography variant="h6" fontWeight={700} color="primary">
                        {issue.voteCount || 0}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }} noWrap>
                    {issue.description}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, color: 'text.secondary' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocationOnIcon sx={{ fontSize: 14 }} />
                      <Typography variant="caption">{issue.location || 'Unknown'}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AccessTimeIcon sx={{ fontSize: 14 }} />
                      <Typography variant="caption">{formatDate(issue.reportedAt)}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default IssuesList;
