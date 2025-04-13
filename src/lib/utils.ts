import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

// Helper to get base URL (optional but useful)
export function getBaseUrl() {
    // Ensure VITE_API_BASE_URL ends without '/api' for general use
    const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
    try {
        // Handles cases like http://localhost:8000/api or http://domain.com
        const url = new URL(apiUrl);
        // Remove '/api' if it exists at the end of the pathname
        const pathname = url.pathname.endsWith('/api')
            ? url.pathname.substring(0, url.pathname.length - '/api'.length)
            : url.pathname;
        // Reconstruct ensuring no double slashes if pathname was '/'
        const baseUrl = `${url.protocol}//${url.host}${pathname === '/' ? '' : pathname}`;
        return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl; // Remove trailing slash
    } catch (e) {
        console.warn("VITE_API_BASE_URL is not a valid URL, returning empty string for base URL.");
        return ''; // Fallback for invalid URL or missing env var
    }
}


// Helper for image URLs
export function getImageUrl(imagePath?: string | null, placeholder: string = '/vite.svg'): string {
    if (!imagePath) {
        return placeholder;
    }
    // If imagePath is already a full URL, use it directly
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }
    // Otherwise, prepend the base URL
    const baseUrl = getBaseUrl();
    // Ensure no double slashes
    const fullPath = `${baseUrl}/${imagePath.startsWith('/') ? imagePath.substring(1) : imagePath}`;
    return fullPath;
}

// Helper to format date
export function formatDate(dateString?: string | Date): string {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    } catch (e) {
        return 'Invalid Date';
    }
}

// Helper to format price
export function formatPrice(price?: string | number): string {
    if (price === null || price === undefined) return 'N/A';
    const numPrice = Number(price);
    if (isNaN(numPrice)) return 'Invalid Price';
    return `$${numPrice.toFixed(2)}`;
}
