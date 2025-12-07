import { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Alert,
    CircularProgress,
    Box
} from '@mui/material';
import { authRoutes } from '../../api/routes';

interface ChangePasswordModalProps {
    open: boolean;
    onClose: () => void;
}

const ChangePasswordModal = ({ open, onClose }: ChangePasswordModalProps) => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        if (newPassword !== confirmPassword) {
            setError("New passwords do not match");
            return;
        }

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        try {
            await authRoutes.changePassword(oldPassword, newPassword);
            setSuccess(true);
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => {
                onClose();
                setSuccess(false);
            }, 1500);
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to change password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Change Password</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    {success && <Alert severity="success" sx={{ mb: 2 }}>Password changed successfully!</Alert>}

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="Current Password"
                            type="password"
                            fullWidth
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            disabled={loading || success}
                            required
                        />
                        <TextField
                            label="New Password"
                            type="password"
                            fullWidth
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={loading || success}
                            required
                        />
                        <TextField
                            label="Confirm New Password"
                            type="password"
                            fullWidth
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={loading || success}
                            required
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={loading || success}
                        startIcon={loading ? <CircularProgress size={20} /> : undefined}
                    >
                        Change Password
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default ChangePasswordModal;
