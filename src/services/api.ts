// src/services/api.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from '../utils/tokenStorage';
import type {
    AuthTokenResponse,
    RefreshTokenResponse,
    Course,
    PaginatedResponse,
    ApiError,
    User
} from '../types';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Add Authorization header
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = tokenStorage.getAccessToken();
        if (token && config.headers) {
            // Don't add Authorization header for token refresh requests
            if (!config.url?.endsWith('/token/refresh/')) {
                config.headers['Authorization'] = `Bearer ${token}`;
            }
        }
        // Handle FormData content type (remove default if FormData is detected)
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// --- Authentication ---

export const login = async (credentials: { username: string; password: string }): Promise<AuthTokenResponse> => {
    try {
        const response = await api.post<AuthTokenResponse>('/token/', credentials);
        if (response.data.access && response.data.refresh) {
            tokenStorage.saveTokens(response.data.access, response.data.refresh);
        }
        return response.data;
    } catch (error) {
        console.error("Login failed:", error);
        throw error; // Re-throw to be handled by the calling component/context
    }
};

export const refreshToken = async (): Promise<string | null> => {
    const refresh = tokenStorage.getRefreshToken();
    if (!refresh) {
        return null; // Or throw an error if refresh must exist
    }
    try {
        const response = await api.post<RefreshTokenResponse>('/token/refresh/', { refresh });
        const newAccessToken = response.data.access;
        if (newAccessToken) {
            tokenStorage.saveAccessToken(newAccessToken);
            return newAccessToken;
        }
        return null;
    } catch (error) {
        console.error("Token refresh failed:", error);
        tokenStorage.clearTokens(); // Clear tokens if refresh fails
        // Optionally redirect to login here or let response interceptor handle it
        throw error;
    }
};


// --- User ---
export const getCurrentUser = async (): Promise<User> => {
    try {
        // Assumes '/users/me/' is the endpoint created in Django
        const response = await api.get<User>('/users/me/');
        return response.data;
    } catch (error) {
        console.error("Failed to fetch current user:", error);
        throw error; // Let the caller handle the error
    }
};

// --- Courses ---

// Define query parameter types for listing courses
interface ListCoursesParams {
    search?: string;
    status?: 'active' | 'inactive' | 'draft';
    ordering?: string; // e.g., 'title', '-price'
    // Add other filters like instructor_id if needed
    page?: number;
}

// Assuming the API returns a paginated list - adjust if not
export const listCourses = async (params?: ListCoursesParams): Promise<PaginatedResponse<Course>> => {
    try {
        // Use URLSearchParams for cleaner query parameter handling
        const queryParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    queryParams.append(key, String(value));
                }
            });
        }
        const response = await api.get<PaginatedResponse<Course>>(`/courses/?${queryParams.toString()}`);
        return response.data;
    } catch (error) {
        console.error("Failed to list courses:", error);
        throw error; // Let caller handle the error state
    }
};

export const getCourseDetails = async (id: number | string): Promise<Course> => {
    try {
        const response = await api.get<Course>(`/courses/${id}/`);
        return response.data;
    } catch (error) {
        console.error(`Failed to get course ${id}:`, error);
        throw error;
    }
};

// Type for Course creation payload (excluding id, created_at, etc.)
// Use Partial for PATCH updates
type CourseCreatePayload = Omit<Course, 'id' | 'created_at' | 'updated_at' | 'instructor' | 'image'> & {
    instructor_id: number;
    image?: File | null; // For FormData
};
type CourseUpdatePayload = Partial<CourseCreatePayload>; // For PATCH

// Create course using JSON
export const createCourseJson = async (courseData: Omit<CourseCreatePayload, 'image'>): Promise<Course> => {
    try {
        const response = await api.post<Course>('/courses/', courseData);
        return response.data;
    } catch (error) {
        console.error("Failed to create course (JSON):", error);
        throw error; // Let the form handle the error display
    }
};

// Create course using FormData (for image upload)
export const createCourseFormData = async (courseData: CourseCreatePayload): Promise<Course> => {
    const formData = new FormData();
    Object.entries(courseData).forEach(([key, value]) => {
        if (key === 'image' && value instanceof File) {
            formData.append(key, value, value.name);
        } else if (value !== null && value !== undefined) {
            // Convert non-file values to string for FormData
            formData.append(key, String(value));
        }
    });

    try {
        // Axios instance might need 'Content-Type': 'multipart/form-data' header,
        // but often it's set automatically when sending FormData.
        // The interceptor already removes the 'application/json' header for FormData.
        const response = await api.post<Course>('/courses/', formData);
        return response.data;
    } catch (error) {
        console.error("Failed to create course (FormData):", error);
        throw error; // Let the form handle the error display
    }
};

// Function to decide which create method to use
export const createCourse = async (courseData: CourseCreatePayload): Promise<Course> => {
    if (courseData.image) {
        return createCourseFormData(courseData);
    } else {
        // Remove image key if it's null/undefined before sending JSON
        const { image, ...jsonData } = courseData;
        return createCourseJson(jsonData);
    }
};


// Update (PATCH - partial update is usually preferred)
export const updateCourse = async (id: number | string, courseData: CourseUpdatePayload): Promise<Course> => {
    // Decide if sending JSON or FormData based on whether 'image' is being updated
    if (courseData.image && courseData.image instanceof File) {
        const formData = new FormData();
        Object.entries(courseData).forEach(([key, value]) => {
            if (key === 'image' && value instanceof File) {
                formData.append(key, value, value.name);
            } else if (value !== null && value !== undefined) {
                formData.append(key, String(value));
            }
        });
        try {
            const response = await api.patch<Course>(`/courses/${id}/`, formData);
            return response.data;
        } catch (error) {
            console.error(`Failed to update course ${id} (FormData):`, error);
            throw error;
        }

    } else {
        // Remove image property if it's not a File (or handle null explicitly if API allows)
        const { image, ...jsonData } = courseData;
        // If image is null/undefined and not a file, ensure it's not sent or sent as null if API allows
        const payload = image === undefined ? jsonData : { ...jsonData, image: null }; // Adjust based on API requirement for clearing image

        try {
            const response = await api.patch<Course>(`/courses/${id}/`, payload);
            return response.data;
        } catch (error) {
            console.error(`Failed to update course ${id} (JSON):`, error);
            throw error;
        }
    }
};

// Delete Course (Soft Delete)
export const deleteCourse = async (id: number | string): Promise<void> => {
    try {
        await api.delete(`/courses/${id}/`);
        // Expects 204 No Content, so no return value needed
    } catch (error) {
        console.error(`Failed to delete course ${id}:`, error);
        throw error;
    }
};


// --- Axios Response Interceptor (Example for 401/Token Refresh) ---
// NOTE: This adds complexity. Implement carefully.
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: unknown) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    response => response, // Simply return successful responses
    async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Check if it's a 401 error, not from a refresh token request itself, and not already retried
        if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/api/token/refresh/') {

            if (isRefreshing) {
                // If already refreshing, queue the original request
                return new Promise(function(resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    if (originalRequest.headers) {
                        originalRequest.headers['Authorization'] = 'Bearer ' + token;
                    }
                    return api(originalRequest); // Retry the original request with the new token
                }).catch(err => {
                    return Promise.reject(err); // Propagate the error if queue processing fails
                });
            }

            originalRequest._retry = true; // Mark as retried
            isRefreshing = true;

            try {
                const newAccessToken = await refreshToken(); // Attempt to refresh the token
                if (newAccessToken && originalRequest.headers) {
                    originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                    processQueue(null, newAccessToken); // Process queue with new token
                    return api(originalRequest); // Retry the original request
                } else {
                    // Refresh token failed or didn't return a new token
                    tokenStorage.clearTokens();
                    // Redirect to login or handle logout
                    window.location.href = '/login'; // Simple redirect
                    const refreshError = new Error('Session expired. Please log in again.');
                    processQueue(refreshError, null); // Process queue with error
                    return Promise.reject(refreshError);
                }
            } catch (refreshError) {
                tokenStorage.clearTokens();
                window.location.href = '/login'; // Simple redirect
                processQueue(refreshError, null); // Process queue with error
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        // For other errors, just reject the promise
        console.error("API Error:", error.response?.data || error.message);
        return Promise.reject(error);
    }
);


export default api; // Export the configured instance
