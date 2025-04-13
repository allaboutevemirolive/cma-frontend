// src/types/api.ts

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
    // Add other user fields if available from API
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
    [key: string]: any; // For field-specific errors
}
