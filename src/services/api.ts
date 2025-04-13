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
    Enrollment,
    Quiz,
    Question,
    Choice,
    Submission,
    Answer,
    CourseCreatePayload,
    CourseUpdatePayload,
    EnrollmentCreatePayload,
    EnrollmentUpdatePayload,
    QuizCreatePayload,
    QuizUpdatePayload,
    QuestionCreatePayload,
    QuestionUpdatePayload,
    ChoiceCreatePayload,
    ChoiceUpdatePayload,
    SubmitAnswerPayload,
    EnrollmentStatus,
    SubmissionStatus,
} from '../types'; // Ensure all types are imported

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api', // Use environment variable or default
    headers: {
        'Content-Type': 'application/json',
    },
});

// --- Interceptors (Keep existing logic for Auth header and FormData) ---
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = tokenStorage.getAccessToken();
        // Exclude token for refresh and potentially login/register endpoints if needed
        const noAuthUrls = ['/token/', '/token/refresh/'];
        if (token && config.headers && !noAuthUrls.some(url => config.url?.endsWith(url))) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        // Handle FormData Content-Type
        if (config.data instanceof FormData) {
            // Axios usually handles this automatically when data is FormData,
            // but explicitly deleting might be needed in some cases if issues arise.
            // delete config.headers['Content-Type'];
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
        throw error; // Re-throw for UI handling
    }
};

export const refreshToken = async (): Promise<string | null> => {
    const refresh = tokenStorage.getRefreshToken();
    if (!refresh) {
        console.log("No refresh token available.");
        return null;
    }
    try {
        console.log("Attempting token refresh...");
        const response = await api.post<RefreshTokenResponse>('/token/refresh/', { refresh });
        const newAccessToken = response.data.access;
        if (newAccessToken) {
            console.log("Token refresh successful.");
            tokenStorage.saveAccessToken(newAccessToken);
            return newAccessToken;
        }
        console.warn("Token refresh response did not contain new access token.");
        tokenStorage.clearTokens(); // Clear tokens if refresh gives unexpected response
        return null;
    } catch (error) {
        console.error("Token refresh failed:", error);
        tokenStorage.clearTokens(); // Clear tokens on refresh failure
        throw error; // Re-throw for interceptor/UI handling
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

// --- Helper function to build query params ---
const buildQueryParams = (params?: Record<string, any>): string => {
    if (!params) return '';
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, String(value));
        }
    });
    const queryString = queryParams.toString();
    return queryString ? `?${queryString}` : '';
}

// --- Courses ---

interface ListCoursesParams {
    search?: string;
    status?: 'active' | 'inactive' | 'draft';
    instructor_id?: number;
    ordering?: string;
    page?: number;
    page_size?: number; // Allow specifying page size
}

export const listCourses = async (params?: ListCoursesParams): Promise<PaginatedResponse<Course>> => {
    try {
        const queryString = buildQueryParams(params);
        const response = await api.get<PaginatedResponse<Course>>(`/courses/${queryString}`);
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

export const createCourse = async (courseData: CourseCreatePayload): Promise<Course> => {
    const headers: Record<string, string> = {};
    let data: CourseCreatePayload | FormData = courseData;

    // Use FormData if an image File is present
    if (courseData.image instanceof File) {
        const formData = new FormData();
        Object.entries(courseData).forEach(([key, value]) => {
            if (key === 'image' && value instanceof File) {
                formData.append(key, value, value.name);
            } else if (value !== null && value !== undefined) {
                formData.append(key, String(value)); // Convert other values to string for FormData
            }
        });
        data = formData;
    } else {
        // Ensure image is not sent if it's not a File (e.g., if it was null initially)
        const { image, ...jsonData } = courseData;
        data = jsonData;
        headers['Content-Type'] = 'application/json';
    }

    try {
        const response = await api.post<Course>('/courses/', data, { headers });
        return response.data;
    } catch (error) {
        console.error("Failed to create course:", error);
        throw error;
    }
};

export const updateCourse = async (id: number | string, courseData: CourseUpdatePayload | FormData): Promise<Course> => {
    const headers: Record<string, string> = {};
    let dataToSend: CourseUpdatePayload | FormData; // Renamed 'data' to avoid conflict

    // --- Type Guard ---
    // Check if the incoming data is already FormData
    if (courseData instanceof FormData) {
        // If it's FormData, it was prepared by the form (likely with a new image file)
        dataToSend = courseData;
        // Let the browser set the Content-Type header automatically for FormData
        delete headers['Content-Type'];
        console.log("API Update: Sending FormData");

    } else {
        // If it's not FormData, it must be CourseUpdatePayload
        headers['Content-Type'] = 'application/json';

        // Now it's safe to access properties of CourseUpdatePayload
        const { image, ...jsonData } = courseData; // Destructure the JSON part

        // Determine the final JSON payload based on the image property
        if (image === null) {
            // Image was explicitly removed, send image: null
            dataToSend = { ...jsonData, image: null };
            console.log("API Update: Sending JSON (removing image)");
        } else {
            // Image was unchanged (undefined) or was never a file initially
            // Send only the other JSON data, excluding the image property
            dataToSend = jsonData;
            console.log("API Update: Sending JSON (image unchanged or undefined)");
        }
    }

    // --- API Call ---
    try {
        // Use the prepared dataToSend and headers
        const response = await api.patch<Course>(`/courses/${id}/`, dataToSend, { headers });
        return response.data;
    } catch (error) {
        console.error(`Failed to update course ${id}:`, error);
        throw error;
    }
};


export const deleteCourse = async (id: number | string): Promise<void> => {
    try {
        await api.delete(`/courses/${id}/`);
    } catch (error) {
        console.error(`Failed to delete course ${id}:`, error);
        throw error;
    }
};

export const restoreCourse = async (id: number | string): Promise<Course> => {
    try {
        const response = await api.post<Course>(`/courses/${id}/restore/`);
        return response.data;
    } catch (error) {
        console.error(`Failed to restore course ${id}:`, error);
        throw error;
    }
};

export const listDeletedCourses = async (params?: ListCoursesParams): Promise<PaginatedResponse<Course>> => {
    try {
        const queryString = buildQueryParams(params);
        const response = await api.get<PaginatedResponse<Course>>(`/courses/deleted/${queryString}`);
        return response.data;
    } catch (error) {
        console.error("Failed to list deleted courses:", error);
        throw error;
    }
};

// --- Enrollments ---

interface ListEnrollmentsParams {
    student_id?: number;
    course_id?: number;
    status?: EnrollmentStatus;
    page?: number;
    page_size?: number;
}

export const listEnrollments = async (params?: ListEnrollmentsParams): Promise<PaginatedResponse<Enrollment>> => {
    try {
        const queryString = buildQueryParams(params);
        const response = await api.get<PaginatedResponse<Enrollment>>(`/enrollments/${queryString}`);
        return response.data;
    } catch (error) {
        console.error("Failed to list enrollments:", error);
        throw error;
    }
};

export const createEnrollment = async (payload: EnrollmentCreatePayload): Promise<Enrollment> => {
    try {
        const response = await api.post<Enrollment>('/enrollments/', payload);
        return response.data;
    } catch (error) {
        console.error("Failed to create enrollment:", error);
        throw error;
    }
};

export const getEnrollmentDetails = async (id: number | string): Promise<Enrollment> => {
    try {
        const response = await api.get<Enrollment>(`/enrollments/${id}/`);
        return response.data;
    } catch (error) {
        console.error(`Failed to get enrollment ${id}:`, error);
        throw error;
    }
};

export const updateEnrollment = async (id: number | string, payload: EnrollmentUpdatePayload): Promise<Enrollment> => {
    try {
        const response = await api.patch<Enrollment>(`/enrollments/${id}/`, payload);
        return response.data;
    } catch (error) {
        console.error(`Failed to update enrollment ${id}:`, error);
        throw error;
    }
};

export const deleteEnrollment = async (id: number | string): Promise<void> => {
    try {
        await api.delete(`/enrollments/${id}/`);
    } catch (error) {
        console.error(`Failed to delete enrollment ${id}:`, error);
        throw error;
    }
};

// --- Quizzes ---

interface ListQuizzesParams {
    course_id?: number;
    page?: number;
    page_size?: number;
}

export const listQuizzes = async (params?: ListQuizzesParams): Promise<PaginatedResponse<Quiz>> => {
    try {
        const queryString = buildQueryParams(params);
        const response = await api.get<PaginatedResponse<Quiz>>(`/quizzes/${queryString}`);
        return response.data;
    } catch (error) {
        console.error("Failed to list quizzes:", error);
        throw error;
    }
};

export const createQuiz = async (payload: QuizCreatePayload): Promise<Quiz> => {
    try {
        const response = await api.post<Quiz>('/quizzes/', payload);
        return response.data;
    } catch (error) {
        console.error("Failed to create quiz:", error);
        throw error;
    }
};

export const getQuizDetails = async (id: number | string): Promise<Quiz> => {
    try {
        // Assuming the detail endpoint includes questions and choices
        const response = await api.get<Quiz>(`/quizzes/${id}/`);
        return response.data;
    } catch (error) {
        console.error(`Failed to get quiz ${id}:`, error);
        throw error;
    }
};

export const updateQuiz = async (id: number | string, payload: QuizUpdatePayload): Promise<Quiz> => {
    try {
        const response = await api.patch<Quiz>(`/quizzes/${id}/`, payload);
        return response.data;
    } catch (error) {
        console.error(`Failed to update quiz ${id}:`, error);
        throw error;
    }
};

export const deleteQuiz = async (id: number | string): Promise<void> => {
    try {
        await api.delete(`/quizzes/${id}/`);
    } catch (error) {
        console.error(`Failed to delete quiz ${id}:`, error);
        throw error;
    }
};

export const startQuizSubmission = async (quizId: number | string): Promise<Submission> => {
    try {
        const response = await api.post<Submission>(`/quizzes/${quizId}/start-submission/`);
        return response.data;
    } catch (error) {
        console.error(`Failed to start submission for quiz ${quizId}:`, error);
        throw error;
    }
};


// --- Questions --- (Note: Assumes flat routes /api/questions/ based on provided list)

interface ListQuestionsParams {
    quiz_id?: number;
    page?: number;
    page_size?: number;
}

export const listQuestions = async (params?: ListQuestionsParams): Promise<PaginatedResponse<Question>> => {
    try {
        const queryString = buildQueryParams(params);
        const response = await api.get<PaginatedResponse<Question>>(`/questions/${queryString}`);
        return response.data;
    } catch (error) {
        console.error("Failed to list questions:", error);
        throw error;
    }
};

export const createQuestion = async (payload: QuestionCreatePayload): Promise<Question> => {
    try {
        const response = await api.post<Question>('/questions/', payload);
        return response.data;
    } catch (error) {
        console.error("Failed to create question:", error);
        throw error;
    }
};

export const getQuestionDetails = async (id: number | string): Promise<Question> => {
    try {
        // Assuming detail includes choices
        const response = await api.get<Question>(`/questions/${id}/`);
        return response.data;
    } catch (error) {
        console.error(`Failed to get question ${id}:`, error);
        throw error;
    }
};

export const updateQuestion = async (id: number | string, payload: QuestionUpdatePayload): Promise<Question> => {
    try {
        const response = await api.patch<Question>(`/questions/${id}/`, payload);
        return response.data;
    } catch (error) {
        console.error(`Failed to update question ${id}:`, error);
        throw error;
    }
};

export const deleteQuestion = async (id: number | string): Promise<void> => {
    try {
        await api.delete(`/questions/${id}/`);
    } catch (error) {
        console.error(`Failed to delete question ${id}:`, error);
        throw error;
    }
};

// --- Choices --- (Note: Assumes flat routes /api/choices/)

interface ListChoicesParams {
    question_id?: number;
    page?: number;
    page_size?: number;
}

export const listChoices = async (params?: ListChoicesParams): Promise<PaginatedResponse<Choice>> => {
    try {
        const queryString = buildQueryParams(params);
        const response = await api.get<PaginatedResponse<Choice>>(`/choices/${queryString}`);
        return response.data;
    } catch (error) {
        console.error("Failed to list choices:", error);
        throw error;
    }
};

export const createChoice = async (payload: ChoiceCreatePayload): Promise<Choice> => {
    try {
        const response = await api.post<Choice>('/choices/', payload);
        return response.data;
    } catch (error) {
        console.error("Failed to create choice:", error);
        throw error;
    }
};

export const getChoiceDetails = async (id: number | string): Promise<Choice> => {
    try {
        const response = await api.get<Choice>(`/choices/${id}/`);
        return response.data;
    } catch (error) {
        console.error(`Failed to get choice ${id}:`, error);
        throw error;
    }
};

export const updateChoice = async (id: number | string, payload: ChoiceUpdatePayload): Promise<Choice> => {
    try {
        const response = await api.patch<Choice>(`/choices/${id}/`, payload);
        return response.data;
    } catch (error) {
        console.error(`Failed to update choice ${id}:`, error);
        throw error;
    }
};

export const deleteChoice = async (id: number | string): Promise<void> => {
    try {
        await api.delete(`/choices/${id}/`);
    } catch (error) {
        console.error(`Failed to delete choice ${id}:`, error);
        throw error;
    }
};


// --- Submissions ---

interface ListSubmissionsParams {
    student_id?: number;
    quiz_id?: number;
    status?: SubmissionStatus;
    page?: number;
    page_size?: number;
}

export const listSubmissions = async (params?: ListSubmissionsParams): Promise<PaginatedResponse<Submission>> => {
    try {
        const queryString = buildQueryParams(params);
        const response = await api.get<PaginatedResponse<Submission>>(`/submissions/${queryString}`);
        return response.data;
    } catch (error) {
        console.error("Failed to list submissions:", error);
        throw error;
    }
};

export const getSubmissionDetails = async (id: number | string): Promise<Submission> => {
    try {
        // Assuming detail includes answers, question details, choice details etc.
        const response = await api.get<Submission>(`/submissions/${id}/`);
        return response.data;
    } catch (error) {
        console.error(`Failed to get submission ${id}:`, error);
        throw error;
    }
};

export const submitAnswer = async (submissionId: number | string, payload: SubmitAnswerPayload): Promise<Answer> => {
    try {
        const response = await api.post<Answer>(`/submissions/${submissionId}/submit-answer/`, payload);
        return response.data;
    } catch (error) {
        console.error(`Failed to submit answer for submission ${submissionId}:`, error);
        throw error;
    }
};

export const finalizeSubmission = async (submissionId: number | string): Promise<Submission> => {
    try {
        const response = await api.post<Submission>(`/submissions/${submissionId}/finalize/`);
        return response.data;
    } catch (error) {
        console.error(`Failed to finalize submission ${submissionId}:`, error);
        throw error;
    }
};


// --- Axios Response Interceptor for 401/Token Refresh ---
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

        // Check if it's a 401, not already retrying, and not the refresh endpoint itself
        if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/token/refresh/') {

            if (isRefreshing) {
                // If refresh is already in progress, queue the request
                return new Promise(function(resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    if (originalRequest.headers && token) { // Ensure token exists
                        originalRequest.headers['Authorization'] = 'Bearer ' + token;
                        return api(originalRequest); // Retry the original request with the new token
                    }
                    return Promise.reject(error); // Reject if no token (refresh failed)
                }).catch(err => {
                    return Promise.reject(err); // Propagate rejection
                });
            }

            console.log("Axios Interceptor: Detected 401, initiating token refresh.");
            originalRequest._retry = true; // Mark that we are retrying this request
            isRefreshing = true;

            try {
                const newAccessToken = await refreshToken(); // Attempt to refresh the token

                if (newAccessToken) {
                    console.log("Axios Interceptor: Refresh successful, processing queue and retrying original request.");
                    if (originalRequest.headers) { // Check headers exist before modifying
                        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                    }
                    processQueue(null, newAccessToken); // Resolve queued requests with the new token
                    return api(originalRequest); // Retry the original request
                } else {
                    // Refresh succeeded but didn't return a token (shouldn't happen with current refreshToken logic)
                    console.error("Axios Interceptor: Refresh seemed successful but no token received.");
                    tokenStorage.clearTokens(); // Log out user
                    processQueue(new Error('Session expired after refresh attempt.'), null); // Reject queued requests
                    if (window.location.pathname !== '/login') window.location.href = '/login'; // Redirect
                    return Promise.reject(new Error('Session expired. Please log in again.'));
                }
            } catch (refreshError) {
                console.error("Axios Interceptor: Refresh failed.", refreshError);
                tokenStorage.clearTokens(); // Log out user
                processQueue(refreshError, null); // Reject queued requests
                if (window.location.pathname !== '/login') window.location.href = '/login'; // Redirect
                return Promise.reject(refreshError); // Reject the original request
            } finally {
                isRefreshing = false; // Reset refreshing flag
            }
        }

        // For errors other than 401, or if it's a retry, just reject
        console.error("API Error (passed through interceptor):", error.response?.data || error.message);
        return Promise.reject(error);
    }
);


export default api;
