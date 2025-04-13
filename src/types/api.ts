// src/types/api.ts

// --- Authentication & User ---
export interface AuthTokenResponse {
    access: string;
    refresh: string;
}

export interface RefreshTokenResponse {
    access: string;
}

// Represents the data structure from /api/users/me/
export interface UserProfile {
    role: 'student' | 'instructor' | 'admin';
    status: 'active' | 'inactive' | 'pending';
    created_at: string;
    updated_at: string;
    // Add other profile fields if they exist (e.g., bio)
}

export interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    is_staff: boolean; // Indicates admin privileges in Django's default User
    profile: UserProfile; // Nested profile information
}

// --- Courses ---
export type CourseStatus = 'active' | 'inactive' | 'draft';

export interface Course {
    id: number;
    title: string;
    description: string;
    price: string; // API often returns DecimalField as string
    instructor: User | null; // Instructor can be null if set to SET_NULL on backend
    instructor_id?: number; // Used for writing/filtering
    status: CourseStatus;
    status_display: string; // Read-only display name for status
    image?: string | null; // URL of the image (relative path from backend)
    created_at: string;
    updated_at: string;
}

// Payload for creating a course
// Correctly defined to match usage in CourseForm and api service
export type CourseCreatePayload = {
    title: string;
    description: string;
    price: string;
    instructor_id: number;
    status?: CourseStatus;
    image?: File | null; // Can be a File for upload or null initially
};

// Payload for updating a course (Partial)
// Correctly defined for PATCH operations
export type CourseUpdatePayload = Partial<Omit<CourseCreatePayload, 'image'>> & {
    // Image can be File (new upload), null (remove), or undefined (no change)
    image?: File | null;
};


// --- Enrollments ---
// **FIX:** Define and export EnrollmentStatus
export type EnrollmentStatus = 'active' | 'completed' | 'cancelled';

export interface Enrollment {
    id: number;
    student: User; // Nested student details expected
    // **NOTE:** Adjust Course type here if the enrollment API nests a *simplified* course object
    course: Course; // Assuming full Course details are nested (adjust if needed)
    enrollment_date: string;
    status: EnrollmentStatus;
    status_display: string; // Read-only display name from backend
    created_at: string;
    updated_at: string;
    student_id?: number; // For writing/filtering
    course_id?: number; // For writing/filtering
}

export type EnrollmentCreatePayload = {
    student_id: number;
    course_id: number;
};

export type EnrollmentUpdatePayload = Partial<{
    status: EnrollmentStatus;
}>;


// --- Quizzes ---
export interface Quiz {
    id: number;
    // **NOTE:** Adjust if API nests Course object here
    course: number; // Assuming API returns course ID here
    title: string;
    description: string;
    time_limit_minutes: number | null;
    questions: Question[]; // Nested questions expected on detail view
    created_at: string;
    updated_at: string;
}

export type QuizCreatePayload = {
    course_id: number;
    title: string;
    description?: string;
    time_limit_minutes?: number | null;
};

export type QuizUpdatePayload = Partial<QuizCreatePayload>;


// --- Questions ---
export type QuestionType = 'MC' | 'SC' | 'TF' | 'TEXT';

export interface Question {
    id: number;
    // **NOTE:** Adjust if API nests Quiz object here
    quiz: number; // Assuming API returns quiz ID here
    text: string;
    question_type: QuestionType;
    order: number;
    choices: Choice[]; // Nested choices expected on detail view
    created_at: string;
    updated_at: string;
}

export type QuestionCreatePayload = {
    quiz_id: number;
    text: string;
    question_type: QuestionType;
    order?: number;
};

export type QuestionUpdatePayload = Partial<QuestionCreatePayload>;


// --- Choices ---
export interface Choice {
    id: number;
    // **NOTE:** Adjust if API nests Question object here
    question: number; // Assuming API returns question ID here
    text: string;
    is_correct: boolean;
    created_at: string;
    updated_at: string;
}

export type ChoiceCreatePayload = {
    question_id: number;
    text: string;
    is_correct?: boolean;
};

export type ChoiceUpdatePayload = Partial<ChoiceCreatePayload>;


// --- Submissions ---
// **FIX:** Define and export SubmissionStatus
export type SubmissionStatus = 'in_progress' | 'submitted' | 'graded';

export interface Submission {
    id: number;
    // **FIX:** Define 'quiz' as an object with expected nested properties
    // This structure matches how SubmissionResultPage tries to access it.
    quiz: {
        id: number;
        title: string;
        course: number; // Assuming the nested quiz has the course ID
    } | number; // Allow number as fallback for simpler API responses if any
    student: User; // Nested student details
    status: SubmissionStatus;
    status_display: string; // Read-only display name from backend
    started_at: string;
    submitted_at: string | null;
    score: string | null; // API often returns DecimalField as string
    answers: Answer[]; // Nested answers expected on detail view
    created_at: string;
    updated_at: string;
    student_id?: number; // For filtering
    quiz_id?: number; // For filtering
}

// --- Answers ---
export interface Answer {
    id: number;
    // **NOTE:** Adjust if API nests Submission object here
    submission: number; // Assuming API returns submission ID here
    question: Question; // Nested question details expected
    selected_choice: Choice | null; // Nested choice details or null
    text_answer: string | null;
    created_at: string;
    updated_at: string;
}

// Payload for submitting an answer via custom action
export type SubmitAnswerPayload = {
    question_id: number;
    selected_choice_id?: number | null;
    text_answer?: string | null;
};


// --- General ---

// Paginated response structure (used by list endpoints)
export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

// Generic API error structure (customize further based on backend specifics)
export interface ApiError {
    detail?: string; // Common for general errors (like 401, 403, 404)
    non_field_errors?: string[]; // Common in DRF for form-level validation errors
    // Field-specific errors (e.g., title: ['This field is required.'])
    [key: string]: any; // Allows for arbitrary field names with errors
}
