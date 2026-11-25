import { useQuery, useQueryClient } from '@tanstack/react-query';
import request from './api/Request';
import { User, CurrentUserContext } from './types/user';

export const CURRENT_USER_QUERY_KEY = ['currentUser'] as const;
export const DEFAULT_AVATAR_URL = 'https://res.cloudinary.com/bs5wxybt/image/upload/v1795596240/b93vlbtifk49gy3jh2fn.png';

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
                let uData = data.data || data;

                const resolvedId = String(uData.id || uData.userId || uData._id || '?');
                const uname = uData.username || uData.userName || '?';
                const role = uData.role || uData.userRole || 'MEMBER';

                let cloudAvatarUrl = uData.avatarUrl || uData.avatar_url || null;
                let cloudAvatarPublicId = uData.avatarPublicId || uData.avatar_public_id || null;
                let cloudIntroVideoUrl = uData.introVideoUrl || uData.intro_video_url || null;
                let cloudIntroVideoPublicId = uData.introVideoPublicId || uData.intro_video_public_id || null;

                // Fallback to /api/users/{id} if /api/auth/me does not include cloud media fields yet
                if (!cloudAvatarUrl && resolvedId !== '?') {
                    try {
                        const userRes: any = await (request as any).get(`/api/users/${resolvedId}`);
                        const fullUser = userRes?.data || userRes;
                        if (fullUser) {
                            uData = { ...fullUser, ...uData };
                            cloudAvatarUrl = fullUser.avatarUrl || fullUser.avatar_url || cloudAvatarUrl;
                            cloudAvatarPublicId = fullUser.avatarPublicId || fullUser.avatar_public_id || cloudAvatarPublicId;
                            cloudIntroVideoUrl = fullUser.introVideoUrl || fullUser.intro_video_url || cloudIntroVideoUrl;
                            cloudIntroVideoPublicId = fullUser.introVideoPublicId || fullUser.intro_video_public_id || cloudIntroVideoPublicId;
                        }
                    } catch {
                        // Keep auth payload if detailed user fetch fails
                    }
                }

                const legacyImage = uData.image || uData.avatar || uData.profilePic;
                const sanitizedLegacyImage =
                    legacyImage && legacyImage !== '/ProfilePic/0.jpg' ? legacyImage : null;

                const resolvedImage = cloudAvatarUrl || sanitizedLegacyImage || DEFAULT_AVATAR_URL;

                return {
                    ...uData,
                    id: resolvedId,
                    username: uname,
                    fullname: uData.fullname || uData.full_name || uData.fullName || uData.name || uname,
                    image: resolvedImage,
                    avatarUrl: cloudAvatarUrl || undefined,
                    avatarPublicId: cloudAvatarPublicId || undefined,
                    introVideoUrl: cloudIntroVideoUrl || undefined,
                    introVideoPublicId: cloudIntroVideoPublicId || undefined,
                    role: role,
                    status: uData.status,
                    theme: uData.theme ? String(uData.theme).toLowerCase() : undefined,
                    raw: uData,
                } as User;
            } catch {
                return null;
            }
        },
        staleTime: 1000 * 60 * 5,
    });

    const currentUser: CurrentUserContext = query.data || ({
        id: '?',
        username: '?',
        fullname: '?',
        image: DEFAULT_AVATAR_URL,
        avatarUrl: undefined,
        introVideoUrl: undefined,
        role: '',
        theme: undefined,
    } as CurrentUserContext);

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