import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Tabs,
    Tab,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Chip,
    CircularProgress,
    Alert,
    Avatar,
    IconButton,
    Tooltip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import BlockIcon from '@mui/icons-material/Block';
import { adminRoutes, type ModerationItem, type AdminUser } from '../../api/routes';
import { AZURE_BACKEND_URL } from '../../constants';

const AdminDashboard = () => {
    const [tab, setTab] = useState(0);
    const [moderationQueue, setModerationQueue] = useState<ModerationItem[]>([]);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    useEffect(() => {
        if (tab === 0) {
            fetchModeration();
        } else {
            fetchUsers();
        }
    }, [tab]);

    const fetchModeration = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await adminRoutes.getModerationQueue();
            setModerationQueue(data);
        } catch (err) {
            setError('Failed to fetch moderation queue');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await adminRoutes.getUsers();
            setUsers(data.users);
        } catch (err) {
            setError('Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async (id: string, action: 'APPROVE' | 'REJECT') => {
        try {
            const result = await adminRoutes.resolveModeration(id, action);
            setSuccessMsg(result.message);
            fetchModeration();
        } catch (err) {
            setError('Failed to resolve moderation');
        }
    };

    const handleBan = async (userId: string) => {
        if (!confirm('Are you sure you want to ban this user?')) return;
        try {
            const result = await adminRoutes.banUser(userId);
            setSuccessMsg(result.message);
            fetchUsers();
        } catch (err) {
            setError('Failed to ban user');
        }
    };

    return (
        <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto' }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
                Admin Dashboard
            </Typography>

            <Paper sx={{ mb: 3 }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                    <Tab label="Moderation Queue" />
                    <Tab label="User Management" />
                </Tabs>
            </Paper>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {successMsg && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>
                    {successMsg}
                </Alert>
            )}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress />
                </Box>
            ) : tab === 0 ? (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Image</TableCell>
                                <TableCell>Title</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Error</TableCell>
                                <TableCell>Reporter</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {moderationQueue.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">
                                        No items pending moderation
                                    </TableCell>
                                </TableRow>
                            ) : (
                                moderationQueue.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            {item.imageBlobId ? (
                                                <Avatar
                                                    variant="rounded"
                                                    src={`${AZURE_BACKEND_URL}/uploads/${item.imageBlobId}`}
                                                    sx={{ width: 60, height: 60 }}
                                                />
                                            ) : (
                                                <Avatar variant="rounded" sx={{ width: 60, height: 60 }}>N/A</Avatar>
                                            )}
                                        </TableCell>
                                        <TableCell>{item.title}</TableCell>
                                        <TableCell>
                                            <Chip label={item.type} size="small" />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={item.error || 'Pending'}
                                                size="small"
                                                color={item.error !== 'NONE' ? 'error' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell>{item.reporter.name}</TableCell>
                                        <TableCell>
                                            <Tooltip title="Approve">
                                                <IconButton
                                                    color="success"
                                                    onClick={() => handleResolve(item.id, 'APPROVE')}
                                                >
                                                    <CheckCircleIcon />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Reject">
                                                <IconButton
                                                    color="error"
                                                    onClick={() => handleResolve(item.id, 'REJECT')}
                                                >
                                                    <CancelIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Role</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        No users found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>{user.name}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={user.role}
                                                size="small"
                                                color={user.role === 'ADMIN' ? 'primary' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={user.isBanned ? 'Banned' : 'Active'}
                                                size="small"
                                                color={user.isBanned ? 'error' : 'success'}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {!user.isBanned && user.role !== 'ADMIN' && (
                                                <Button
                                                    variant="outlined"
                                                    color="error"
                                                    size="small"
                                                    startIcon={<BlockIcon />}
                                                    onClick={() => handleBan(user.id)}
                                                >
                                                    Ban
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};

export default AdminDashboard;
