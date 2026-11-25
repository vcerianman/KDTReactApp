import request from '../api/Request';

const CLOUD_NAME = 'bs5wxybt';
export const DEFAULT_AVATAR_URL = 'https://res.cloudinary.com/bs5wxybt/image/upload/v1795596240/b93vlbtifk49gy3jh2fn.png';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];

const MAX_AVATAR_INPUT_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_POST_IMAGE_INPUT_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_VIDEO_INPUT_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_POST_IMAGES = 4;

/**
 * Center-crops an image to a 1:1 square and scales it down to maxSize x maxSize WebP.
 * Keeps native resolution if the source image is already smaller than maxSize.
 */
function resizeAvatarToWebp(file, maxSize = 256) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);

            const minSide = Math.min(img.width, img.height);
            const targetSize = Math.min(maxSize, minSide);
            const sx = (img.width - minSide) / 2;
            const sy = (img.height - minSide) / 2;

            const canvas = document.createElement('canvas');
            canvas.width = targetSize;
            canvas.height = targetSize;

            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, targetSize, targetSize);

            canvas.toBlob(
                (blob) => (blob ? resolve(blob) : reject(new Error('Avatar compression failed.'))),
                'image/webp',
                0.85
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Invalid image file.'));
        };

        img.src = objectUrl;
    });
}

/**
 * Preserves aspect ratio and scales the longest edge down to maxDimension WebP.
 */
function resizeDiscussionImageToWebp(file, maxDimension = 1600) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);

            const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
            const targetWidth = Math.round(img.width * scale);
            const targetHeight = Math.round(img.height * scale);

            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;

            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

            canvas.toBlob(
                (blob) => (blob ? resolve(blob) : reject(new Error('Image compression failed.'))),
                'image/webp',
                0.82
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Invalid image file.'));
        };

        img.src = objectUrl;
    });
}

/**
 * Requests a short-lived signature from the authenticated Spring Boot backend
 * and uploads the media directly from the browser to Cloudinary.
 */
async function uploadToCloudinary(fileOrBlob, filename, subFolder) {
    const signRes = await request.post('/api/media/signature', { folder: subFolder });
    const { signature, timestamp, apiKey, uploadPreset, folder } = signRes?.data || signRes;

    if (!signature || !timestamp || !apiKey || !uploadPreset) {
        throw new Error('Invalid upload signature received from server.');
    }

    const formData = new FormData();
    formData.append('file', fileOrBlob, filename);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    formData.append('upload_preset', uploadPreset);
    formData.append('asset_folder', folder || subFolder);

    // Do NOT attach the Spring Boot JWT Authorization header to Cloudinary
    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: 'POST',
        body: formData
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data?.error?.message || 'Cloudinary upload failed.');
    }

    return {
        url: data.secure_url,
        publicId: data.public_id
    };
}

/**
 * Uploads a user's profile avatar (256x256 max WebP) to kdt-taskflow/avatars.
 * @param {string|number} userId
 * @param {File} rawFile
 * @returns {Promise<{url: string, publicId: string}>}
 */
export async function uploadAvatarFile(userId, rawFile) {
    if (!rawFile) {
        throw new Error('No profile picture selected.');
    }
    if (!ALLOWED_IMAGE_TYPES.includes(rawFile.type)) {
        throw new Error('Profile picture must be a PNG, JPG, or WebP image.');
    }
    if (rawFile.size > MAX_AVATAR_INPUT_BYTES) {
        throw new Error('Profile picture must be 10 MB or smaller.');
    }

    const webpBlob = await resizeAvatarToWebp(rawFile, 256);
    return uploadToCloudinary(webpBlob, `avatar-${userId}.webp`, 'kdt-taskflow/avatars');
}

/**
 * Uploads a user's introduction video (20 MB max MP4/WebM) to kdt-taskflow/videos.
 * @param {File} rawFile
 * @returns {Promise<{url: string, publicId: string}>}
 */
export async function uploadIntroVideoFile(rawFile) {
    if (!rawFile) {
        throw new Error('No video file selected.');
    }
    if (!ALLOWED_VIDEO_TYPES.includes(rawFile.type)) {
        throw new Error('Only MP4 and WebM videos are allowed.');
    }
    if (rawFile.size > MAX_VIDEO_INPUT_BYTES) {
        throw new Error('Introduction video must be 20 MB or smaller.');
    }

    return uploadToCloudinary(rawFile, rawFile.name, 'kdt-taskflow/videos');
}

/**
 * Compresses and uploads up to 4 discussion post/reply images (1600px max WebP)
 * to kdt-taskflow/images.
 * @param {File[]|FileList} rawFiles
 * @returns {Promise<Array<{url: string, publicId: string}>>}
 */
export async function uploadPostImages(rawFiles) {
    const files = Array.from(rawFiles || []);
    if (files.length === 0) {
        return [];
    }
    if (files.length > MAX_POST_IMAGES) {
        throw new Error(`You can upload a maximum of ${MAX_POST_IMAGES} images per post or reply.`);
    }

    for (const file of files) {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            throw new Error(`Unsupported format for "${file.name}". Use PNG, JPG, or WebP.`);
        }
        if (file.size > MAX_POST_IMAGE_INPUT_BYTES) {
            throw new Error(`"${file.name}" exceeds the 5 MB limit.`);
        }
    }

    const uploads = files.map(async (file, index) => {
        const webpBlob = await resizeDiscussionImageToWebp(file, 1600);
        return uploadToCloudinary(webpBlob, `post-img-${index}.webp`, 'kdt-taskflow/images');
    });

    return Promise.all(uploads);
}