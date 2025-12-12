import api from './axios';

export interface IssueFilters {
    issueType?: string;
    statusOpen?: boolean;
    statusInProgress?: boolean;
    urgency?: string;
    showResolved?: boolean;
}

export interface IssueReportData {
    type: string;
    lat?: number;
    lng?: number;
    description: string;
    isAnonymous: boolean;
    files?: File[];
}

export interface Issue {
    id: string;
    title: string;
    type: string;
    status: string;
    urgency: string;
    location: string;
    lat?: number;
    lng?: number;
    description: string;
    voteCount: number;
    reportedAt: string;
    reporterId?: string;
}

export interface Bounds {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
}

export interface MapIssue {
    id: string;
    title: string;
    type: string;
    status: string;
    description: string;
    lat: number;
    lng: number;
    voteCount: number;
    commentCount: number;
    urgencyScore: number;
    reportedAt: string;
}

export interface IssueType {
    id: string;
    name: string;
    description: string;
    department: string;
}

export interface Comment {
    id: string;
    content: string;
    createdAt: string;
    author: {
        id: string;
        name: string;
        credibility?: number;
        badges?: string[];
    };
    upvoteCount: number;
    hasUpvoted: boolean;
    isFlagged: boolean;
}

export interface Analytics {
    totalIssues: number;
    resolvedIssues: number;
    averageResolutionTime: number;
    issuesByType: Record<string, number>;
    issuesByStatus: Record<string, number>;
    trendData: Array<{ date: string; count: number }>;
}

export interface Notification {
    id: string;
    type: string;
    message: string;
    read: boolean;
    createdAt: string;
}

export const authRoutes = {
    logout: async (): Promise<{ success: boolean }> => {
        const response = await api.post('/auth/logout');
        return response.data;
    },

    register: async (email: string, password: string, name?: string): Promise<{ ok: boolean; token: string }> => {
        const response = await api.post('/auth/register', { email, password, name });
        return response.data;
    },

    login: async (email: string, password: string): Promise<{ ok: boolean; token: string }> => {
        const response = await api.post('/auth/login', { email, password });
        return response.data;
    },

    changePassword: async (oldPassword: string, newPassword: string): Promise<{ success: boolean }> => {
        const response = await api.post('/auth/change-password', { oldPassword, newPassword });
        return response.data;
    },
};

export const issueRoutes = {
    getIssues: async (filters?: IssueFilters): Promise<Issue[]> => {
        const response = await api.get('/issues', { params: filters });
        return response.data;
    },

    getIssueById: async (id: string): Promise<Issue> => {
        const response = await api.get(`/issues/${id}`);
        return response.data;
    },

    reportIssue: async (data: IssueReportData): Promise<Issue> => {
        // If files are present, send as FormData for multer to process
        if (data.files && data.files.length > 0) {
            const formData = new FormData();
            formData.append('type', data.type);
            formData.append('description', data.description);
            formData.append('isAnonymous', String(data.isAnonymous));
            if (data.lat !== undefined) {
                formData.append('lat', String(data.lat));
            }
            if (data.lng !== undefined) {
                formData.append('lng', String(data.lng));
            }
            // Backend expects single file with field name 'file'
            formData.append('file', data.files[0]);

            const response = await api.post('/issues/report', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data;
        }

        // No files, send as JSON
        const payload = {
            type: data.type,
            description: data.description,
            isAnonymous: data.isAnonymous,
            lat: data.lat,
            lng: data.lng,
        };
        const response = await api.post('/issues/report', payload);
        return response.data;
    },

    getIssueTypes: async (): Promise<IssueType[]> => {
        const response = await api.get('/issues/types');
        return response.data;
    },

    voteOnIssue: async (id: string, location?: { lat: number; lng: number }): Promise<{ voteCount: number; hasVoted: boolean }> => {
        const response = await api.post(`/issues/${id}/vote`, {
            userLat: location?.lat,
            userLng: location?.lng,
        });
        return response.data;
    },

    validatePhoto: async (file: File): Promise<{ valid: boolean; reason?: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/issues/validate-photo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    getMapIssues: async (bounds: Bounds, filters?: IssueFilters): Promise<MapIssue[]> => {
        // LocalStorage cache key based on bounds (rounded to reduce cache misses)
        const cacheKey = `map_issues_${Math.round(bounds.minLat * 100)}_${Math.round(bounds.maxLat * 100)}_${Math.round(bounds.minLng * 100)}_${Math.round(bounds.maxLng * 100)}_${filters?.showResolved || false}`;
        const cacheTTL = 5 * 60 * 1000;

        // Check localStorage cache first
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < cacheTTL) {
                    console.log('[Cache] localStorage hit for map issues');
                    return data;
                }
                // Expired, remove from cache
                localStorage.removeItem(cacheKey);
            }
        } catch (e) {
            // localStorage not available or parse error, continue to API
        }

        // Fetch from API (which hits Redis -> PostgreSQL)
        const response = await api.get('/issues/map', {
            params: {
                minLat: bounds.minLat,
                maxLat: bounds.maxLat,
                minLng: bounds.minLng,
                maxLng: bounds.maxLng,
                type: filters?.issueType || undefined,
                statusOpen: filters?.statusOpen,
                statusInProgress: filters?.statusInProgress,
                urgency: filters?.urgency || undefined,
                showResolved: filters?.showResolved,
            },
        });

        // Cache in localStorage
        try {
            localStorage.setItem(cacheKey, JSON.stringify({
                data: response.data,
                timestamp: Date.now(),
            }));
            console.log('[Cache] Cached map issues in localStorage');
        } catch (e) {
            // localStorage full or not available, ignore
        }

        return response.data;
    },
};

export const commentRoutes = {
    getComments: async (issueId: string): Promise<Comment[]> => {
        const response = await api.get(`/issues/${issueId}/comments`);
        return response.data;
    },

    addComment: async (issueId: string, content: string, location?: { lat: number; lng: number }): Promise<Comment> => {
        const response = await api.post(`/issues/${issueId}/comments`, {
            content,
            userLat: location?.lat,
            userLng: location?.lng,
        });
        return response.data;
    },

    deleteComment: async (commentId: string): Promise<{ success: boolean }> => {
        const response = await api.delete(`/comments/${commentId}`);
        return response.data;
    },

    upvoteComment: async (commentId: string): Promise<{ upvoteCount: number; hasUpvoted: boolean }> => {
        const response = await api.post(`/comments/${commentId}/upvote`);
        return response.data;
    },

    flagComment: async (commentId: string, reason?: string): Promise<{ success: boolean }> => {
        const response = await api.post(`/comments/${commentId}/flag`, { reason });
        return response.data;
    },
};

export interface AnalyticsSummary {
    personalImpact: {
        issuesReported: number;
        issuesResolved: number;
        resolutionRate: number;
    } | null;
    communityHealth: {
        avgResolutionTimeHours: number;
        reopenRate: number;
        totalActiveIssues: number;
    };
    trend: Array<{ date: string; reported: number; resolved: number }>;
}

export interface HeatmapPoint {
    lat: number;
    lng: number;
    weight: number;
}

export const analyticsRoutes = {
    getSummary: async (timeRange?: string): Promise<AnalyticsSummary> => {
        const response = await api.get('/api/analytics/summary', { params: { timeRange } });
        return response.data;
    },

    getHeatmap: async (bounds: Bounds): Promise<HeatmapPoint[]> => {
        const response = await api.get('/api/analytics/heatmap', { params: bounds });
        return response.data;
    },

    exportData: async (format: 'csv' | 'json'): Promise<void> => {
        const response = await api.get('/api/analytics/export', {
            params: { format },
            responseType: 'blob',
        });

        const blob = new Blob([response.data], {
            type: format === 'csv' ? 'text/csv' : 'application/json',
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `my-civic-report.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    },
};

export const notificationRoutes = {
    getNotifications: async (): Promise<Notification[]> => {
        const response = await api.get('/notifications');
        return response.data;
    },

    markAsRead: async (id: string): Promise<{ success: boolean }> => {
        const response = await api.patch(`/notifications/${id}/read`);
        return response.data;
    },

    markAllAsRead: async (): Promise<{ success: boolean }> => {
        const response = await api.patch('/notifications/read-all');
        return response.data;
    },
};

export interface UserProfile {
    id: string;
    name: string | null;
    email: string;
    picture: string | null;
    role: string;
    credibility: number;
    badges: Array<{ id: number; name: string; awardedAt: string }>;
    stats: {
        issuesReported: number;
        commentsPosted: number;
        points: number;
    };
}

export interface UserIssue {
    id: string;
    title: string;
    type: string;
    status: string;
    location: string;
    lat: number;
    lng: number;
    voteCount: number;
    commentCount: number;
    reportedAt: string;
}

export interface UserComment {
    id: string;
    content: string;
    createdAt: string;
    issueId: string;
    issueTitle: string;
    upvoteCount: number;
}

export const userRoutes = {
    getMe: async (): Promise<UserProfile> => {
        const response = await api.get('/api/user/me');
        return response.data;
    },

    getMyIssues: async (): Promise<UserIssue[]> => {
        const response = await api.get('/api/user/me/issues');
        return response.data;
    },

    getMyComments: async (): Promise<UserComment[]> => {
        const response = await api.get('/api/user/me/comments');
        return response.data;
    }
};

export interface RouteResult {
    path: Array<{ lat: number; lng: number }>;
    totalDistance: number;
    estimatedTime: number;
}

export const routeRoutes = {
    findRoute: async (
        start: { lat: number; lng: number },
        end: { lat: number; lng: number }
    ): Promise<RouteResult> => {
        const response = await api.post('/api/route', { start, end });
        return response.data;
    },
};

// Admin routes
export interface ModerationItem {
    id: string;
    title: string;
    description: string;
    type: string;
    status: string;
    error: string;
    authorized: string;
    severity: number | null;
    imageBlobId: string | null;
    createdAt: string;
    reporter: { id: string; name: string; email: string };
}

export interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: string;
    isBanned: boolean;
    createdAt: string;
}

export const adminRoutes = {
    getModerationQueue: async (): Promise<ModerationItem[]> => {
        const response = await api.get('/admin/moderation');
        return response.data;
    },

    resolveModeration: async (issueId: string, action: 'APPROVE' | 'REJECT'): Promise<{ success: boolean; message: string }> => {
        const response = await api.post(`/admin/moderation/${issueId}/resolve`, { action });
        return response.data;
    },

    getUsers: async (page?: number): Promise<{ users: AdminUser[]; total: number; page: number; pageSize: number }> => {
        const response = await api.get('/admin/users', { params: { page } });
        return response.data;
    },

    banUser: async (userId: string, reason?: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.post(`/admin/users/${userId}/ban`, { reason });
        return response.data;
    },
};

export default {
    auth: authRoutes,
    issues: issueRoutes,
    comments: commentRoutes,
    analytics: analyticsRoutes,
    notifications: notificationRoutes,
    route: routeRoutes,
    user: userRoutes,
    admin: adminRoutes,
};
