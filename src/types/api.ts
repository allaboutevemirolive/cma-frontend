// src/types/api.ts

export interface UserProfile {
    role: 'student' | 'instructor' | 'admin';
    status: string;
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
    email?: string;
    first_name?: string;
    last_name?: string;
    is_staff?: boolean;
    profile?: UserProfile | null;
}

export interface Course {
    id: number;
    title: string;
    description: string;
    price: string;
    instructor: User;
    instructor_id?: number;
    status: 'active' | 'inactive' | 'draft';
    image?: string | null;
    created_at: string;
    updated_at: string;
}

export interface RegistrationPayload {
    username: string;
    email: string;
    password?: string;
    password2?: string;
    first_name?: string;
    last_name?: string;
    role: 'student' | 'instructor';
}

export interface Enrollment {
    id: number;
    student: User;
    course: Pick<Course, 'id' | 'title' | 'instructor'>;
    enrollment_date: string;
    status: 'active' | 'completed' | 'cancelled';
    status_display?: string;
    created_at: string;
    updated_at: string;
}

export interface EnrollPayload {
    course_id: number;
}

export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

export interface ApiError {
    detail?: string;
    non_field_errors?: string[] | string;
    [key: string]: any;
}
