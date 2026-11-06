import { useQuery, useQueryClient } from '@tanstack/react-query';
import request from './api/Request';
import { getUserAvatarUrl } from './utils';
import { User, CurrentUserContext } from './types/user';

export const CURRENT_USER_QUERY_KEY = ['currentUser'] as const;

export interface UseCurrentUserResult {
    data: User | null | undefined;
    isLoading: boolean;
    isError: boolean;
    error: unknown;
    status: 'pending' | 'error' | 'success';
    refetch: () => Promise<any>;
    user: CurrentUserContext;
    currentUser: CurrentUserContext;
    isAuthorizedAdmin: boolean;
    invalidateCurrentUser: () => Promise<void>;
    [key: string]: any;
}

// caches /api/auth/me for 5 minutes
export function useCurrentUser(): UseCurrentUserResult {
    const client = useQueryClient();

    const query = useQuery<User | null>({
        queryKey: CURRENT_USER_QUERY_KEY,
        queryFn: async (): Promise<User | null> => {
            try {
                const data: any = await (request as any).get('/api/auth/me');
                if (!data) return null;
                const uData = data.data || data;
                const uname = uData.username || uData.userName || '?';
                const role = uData.role || uData.userRole || 'MEMBER';
                return {
                    ...uData,
                    id: String(uData.id || uData.userId || uData._id || '?'),
                    username: uname,
                    fullname: uData.fullname || uData.full_name || uData.fullName || uData.name || uname,
                    image: uData.image || uData.avatar || uData.profilePic || (uname !== '?' ? getUserAvatarUrl(uname) : '/ProfilePic/0.jpg'),
                    role: role,
                    status: uData.status,
                    theme: uData.theme ? String(uData.theme).toLowerCase() : undefined,
                    raw: uData,
                };
            } catch {
                return null;
            }
        },
        staleTime: 1000 * 60 * 5,
    });

    const currentUser: CurrentUserContext = query.data || {
        id: '?',
        username: '?',
        fullname: '?',
        image: '/ProfilePic/0.jpg',
        role: '',
        theme: undefined,
    };

    const normalizedRole = String(currentUser.role || '').toUpperCase();
    const isAuthorizedAdmin = normalizedRole.includes('ADMIN') || normalizedRole.includes('GOD');

    const invalidateCurrentUser = () => {
        return client.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    };

    return {
        ...query,
        user: currentUser,
        currentUser,
        isAuthorizedAdmin,
        invalidateCurrentUser,
    };
}

export default useCurrentUser;

