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
            if (!config.url?.endsWith('/token/refresh/')) {
                config.headers['Authorization'] = `Bearer ${token}`;
            }
        }
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
        throw error;
    }
};

export const refreshToken = async (): Promise<string | null> => {
    const refresh = tokenStorage.getRefreshToken();
    if (!refresh) {
        return null;
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
        tokenStorage.clearTokens();
        throw error;
    }
};


// --- User ---
export const getCurrentUser = async (): Promise<User> => {
    try {
        const response = await api.get<User>('/users/me/');
        return response.data;
    } catch (error) {
        console.error("Failed to fetch current user:", error);
        throw error;
    }
};

// --- Courses ---

interface ListCoursesParams {
    search?: string;
    status?: 'active' | 'inactive' | 'draft';
    ordering?: string;
    page?: number;
}

export const listCourses = async (params?: ListCoursesParams): Promise<PaginatedResponse<Course>> => {
    try {
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
        throw error;
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

// Export the payload types
export type CourseCreatePayload = Omit<Course, 'id' | 'created_at' | 'updated_at' | 'instructor' | 'image'> & {
    instructor_id: number;
    image?: File | null;
};
export type CourseUpdatePayload = Partial<CourseCreatePayload>;

// Create course using JSON
export const createCourseJson = async (courseData: Omit<CourseCreatePayload, 'image'>): Promise<Course> => {
    try {
        const response = await api.post<Course>('/courses/', courseData);
        return response.data;
    } catch (error) {
        console.error("Failed to create course (JSON):", error);
        throw error;
    }
};

// Create course using FormData (for image upload)
export const createCourseFormData = async (courseData: CourseCreatePayload): Promise<Course> => {
    const formData = new FormData();
    Object.entries(courseData).forEach(([key, value]) => {
        if (key === 'image' && value instanceof File) {
            formData.append(key, value, value.name);
        } else if (value !== null && value !== undefined) {
            formData.append(key, String(value));
        }
    });

    try {
        const response = await api.post<Course>('/courses/', formData);
        return response.data;
    } catch (error) {
        console.error("Failed to create course (FormData):", error);
        throw error;
    }
};

// Function to decide which create method to use
export const createCourse = async (courseData: CourseCreatePayload): Promise<Course> => {
    if (courseData.image) {
        return createCourseFormData(courseData);
    } else {
        const { image, ...jsonData } = courseData;
        return createCourseJson(jsonData);
    }
};


// Update (PATCH - partial update is usually preferred)
export const updateCourse = async (id: number | string, courseData: CourseUpdatePayload): Promise<Course> => {
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
        const { image, ...jsonData } = courseData;
        const payload = image === undefined ? jsonData : { ...jsonData, image: null };

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
    } catch (error) {
        console.error(`Failed to delete course ${id}:`, error);
        throw error;
    }
};


// --- Axios Response Interceptor (Example for 401/Token Refresh) ---
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
    response => response,
    async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/api/token/refresh/') {

            if (isRefreshing) {
                return new Promise(function(resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    if (originalRequest.headers) {
                        originalRequest.headers['Authorization'] = 'Bearer ' + token;
                    }
                    return api(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const newAccessToken = await refreshToken();
                if (newAccessToken && originalRequest.headers) {
                    originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                    processQueue(null, newAccessToken);
                    return api(originalRequest);
                } else {
                    tokenStorage.clearTokens();
                    window.location.href = '/login';
                    const refreshError = new Error('Session expired. Please log in again.');
                    processQueue(refreshError, null);
                    return Promise.reject(refreshError);
                }
            } catch (refreshError) {
                tokenStorage.clearTokens();
                window.location.href = '/login';
                processQueue(refreshError, null);
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        console.error("API Error:", error.response?.data || error.message);
        return Promise.reject(error);
    }
);


export default api;
