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

    voteOnIssue: async (id: string): Promise<{ voteCount: number; hasVoted: boolean }> => {
        const response = await api.post(`/issues/${id}/vote`);
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
        const response = await api.get('/issues/map', {
            params: {
                minLat: bounds.minLat,
                maxLat: bounds.maxLat,
                minLng: bounds.minLng,
                maxLng: bounds.maxLng,
                type: filters?.issueType,
                status: filters?.statusOpen ? 'PENDING' : filters?.statusInProgress ? 'IN_PROGRESS' : undefined,
            },
        });
        return response.data;
    },
};

export const commentRoutes = {
    getComments: async (issueId: string): Promise<Comment[]> => {
        const response = await api.get(`/issues/${issueId}/comments`);
        return response.data;
    },

    addComment: async (issueId: string, content: string): Promise<Comment> => {
        const response = await api.post(`/issues/${issueId}/comments`, { content });
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

export const analyticsRoutes = {
    getAnalytics: async (params?: { userId?: string; filters?: IssueFilters }): Promise<Analytics> => {
        const response = await api.get('/analytics', { params });
        return response.data;
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

export default {
    auth: authRoutes,
    issues: issueRoutes,
    comments: commentRoutes,
    analytics: analyticsRoutes,
    notifications: notificationRoutes,
};

