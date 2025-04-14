// src/services/api.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from '../utils/tokenStorage';
import type {
    AuthTokenResponse,
    RefreshTokenResponse,
    Course,
    PaginatedResponse,
    ApiError,
    User,
    RegistrationPayload, // Added
    EnrollPayload,       // Added
    Enrollment,          // Added
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
            // Don't add Auth header for refresh requests or public endpoints like register/login
            if (!config.url?.endsWith('/token/refresh/') &&
                !config.url?.endsWith('/token/') &&
                !config.url?.endsWith('/register/')) {
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
        throw error; // Re-throw to be handled by the caller
    }
};

// Add Registration function
export const registerUser = async (payload: RegistrationPayload): Promise<User> => {
    try {
        // Backend expects password & password2
        const apiPayload = { ...payload, password2: payload.password };
        const response = await api.post<User>('/register/', apiPayload);
        // Registration doesn't typically return tokens directly, user needs to login after
        return response.data; // Return the created user data
    } catch (error) {
        console.error("Registration failed:", error);
        throw error; // Re-throw to be handled by the caller
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
        // Ensure this endpoint returns the nested profile
        const response = await api.get<User>('/users/me/');
        return response.data;
    } catch (error) {
        console.error("Failed to fetch current user:", error);
        // Handle 401 specifically if needed, though interceptor might handle it
        if ((error as AxiosError).response?.status === 401) {
            // Optionally trigger logout or specific action
            console.warn("Unauthorized fetching user details, likely expired token.");
        }
        throw error;
    }
};

// --- Courses ---

interface ListCoursesParams {
    search?: string;
    status?: 'active' | 'inactive' | 'draft';
    ordering?: string;
    page?: number;
    page_size?: number; // Added for consistency
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
            // Convert boolean/number to string if necessary for FormData
            formData.append(key, String(value));
        }
    });

    try {
        // Axios will set Content-Type to multipart/form-data automatically
        const response = await api.post<Course>('/courses/', formData);
        return response.data;
    } catch (error) {
        console.error("Failed to create course (FormData):", error);
        throw error;
    }
};

// Function to decide which create method to use
export const createCourse = async (courseData: CourseCreatePayload): Promise<Course> => {
    if (courseData.image instanceof File) { // Only use FormData if image is a *new* File
        return createCourseFormData(courseData);
    } else {
        // If image is null, undefined, or a string URL, use JSON.
        // Remove image field entirely if not a file.
        const { image, ...jsonData } = courseData;
        return createCourseJson(jsonData);
    }
};


// Update (PATCH - partial update is usually preferred)
export const updateCourse = async (id: number | string, courseData: CourseUpdatePayload): Promise<Course> => {
    // Check if the image field is present and is a File object
    if (courseData.image && courseData.image instanceof File) {
        // Use FormData for update if a new image file is being uploaded
        const formData = new FormData();
        Object.entries(courseData).forEach(([key, value]) => {
            if (key === 'image' && value instanceof File) {
                formData.append(key, value, value.name);
            } else if (value !== undefined) { // Important: Check for undefined, allow null
                // Convert boolean/number to string if backend expects strings in FormData
                // Check your backend serializer requirements for FormData fields
                formData.append(key, value === null ? '' : String(value)); // Send null as empty string or handle on backend
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
        // Use JSON for update if no new image file is uploaded
        // Handle explicit image removal (image: null) or no image change (image field absent)
        let payload: any = {};
        if ('image' in courseData) { // Check if image key exists in the update data
            payload = { ...courseData, image: courseData.image }; // Send null or the existing URL string if provided
            if (payload.image === undefined) delete payload.image; // Don't send undefined
        } else {
            // If 'image' key is not in courseData, don't include it in JSON payload
            const { image, ...jsonData } = courseData;
            payload = jsonData;
        }

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

// --- Enrollments ---
export const enrollUser = async (payload: EnrollPayload): Promise<Enrollment> => {
    try {
        const response = await api.post<Enrollment>('/enrollments/', payload);
        return response.data;
    } catch (error) {
        console.error("Failed to enroll:", error);
        throw error;
    }
}

// --- Axios Response Interceptor (Example for 401/Token Refresh) ---
// ... (interceptor logic remains the same) ...
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

        // Check if it's a 401, not a retry, and not the refresh endpoint itself
        if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/token/refresh/') {

            if (isRefreshing) {
                // If refresh is already happening, queue the request
                return new Promise(function(resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    // Retry the original request with the new token
                    if (originalRequest.headers) {
                        originalRequest.headers['Authorization'] = 'Bearer ' + token;
                    }
                    return api(originalRequest);
                }).catch(err => {
                    // If the refresh failed while queueing, reject the promise
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true; // Mark as retried
            isRefreshing = true;

            try {
                const newAccessToken = await refreshToken(); // Attempt to refresh
                if (newAccessToken && originalRequest.headers) {
                    // If refresh successful, update header and retry original request
                    api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`; // Update default for subsequent requests too
                    originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                    processQueue(null, newAccessToken); // Process queue with new token
                    return api(originalRequest); // Retry the original request
                } else {
                    // Refresh failed or didn't return a token
                    tokenStorage.clearTokens();
                    processQueue(new Error('Session expired or refresh failed.'), null); // Reject queued requests
                    // Redirect to login - consider doing this in AuthContext based on error type
                    // window.location.href = '/login';
                    return Promise.reject(new Error('Session expired or refresh failed.'));
                }
            } catch (refreshError) {
                // Catch errors during the refresh token call itself
                tokenStorage.clearTokens();
                processQueue(refreshError, null); // Reject queued requests with the refresh error
                // Redirect to login - consider doing this in AuthContext based on error type
                // window.location.href = '/login';
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false; // Release the refreshing lock
            }
        }

        // For errors other than 401, just reject the promise
        console.error("API Error (Unhandled by Interceptor):", error.response?.data || error.message);
        return Promise.reject(error);
    }
);


export default api;
