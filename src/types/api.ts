// src/types/api.ts

export interface UserProfile {
    role: 'student' | 'instructor' | 'admin';
    status: string; // Assuming status is a string like 'active', 'inactive'
}

export interface AuthTokenResponse {
    access: string;
    refresh: string;
}

export interface RefreshTokenResponse {
    access: string;
}

export interface User {
    id: number;
    username: string;
    email?: string; // Optional based on API response
    first_name?: string;
    last_name?: string;
    is_staff?: boolean; // Important for admin checks
    profile?: UserProfile | null; // Nested profile information
}

export interface Course {
    id: number;
    title: string;
    description: string;
    price: string; // API returns price as string
    instructor: User; // Assuming instructor details are nested
    instructor_id?: number; // For creation/update payload
    status: 'active' | 'inactive' | 'draft';
    image?: string | null; // URL of the image
    created_at: string;
    updated_at: string;
}

// Registration Payload
export interface RegistrationPayload {
    username: string;
    email: string;
    password?: string; // Optional because password2 is used for confirmation
    password2?: string;
    first_name?: string;
    last_name?: string;
    role: 'student' | 'instructor'; // Roles allowed for registration
}

// Enrollment Types
export interface Enrollment {
    id: number;
    student: User;
    course: Pick<Course, 'id' | 'title' | 'instructor'>; // Simplified nested course
    enrollment_date: string;
    status: 'active' | 'completed' | 'cancelled';
    status_display?: string; // From serializer if provided
    created_at: string;
    updated_at: string;
}

export interface EnrollPayload {
    course_id: number;
}


// Paginated response structure if your API uses it
export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

// Error structure from API (adjust as needed)
export interface ApiError {
    detail?: string;
    non_field_errors?: string[] | string;
    [key: string]: any; // For field-specific errors (e.g., username: ["error msg"])
}
