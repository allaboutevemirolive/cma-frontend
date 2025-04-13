// src/contexts/AuthContext.tsx
import React, {
    createContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    ReactNode,
} from 'react';
import { tokenStorage } from '../utils/tokenStorage';
import {
    login as apiLogin,
    getCurrentUser // Import the function to get user details
} from '../services/api';
import { User } from '../types'; // Import the updated User type with Profile

interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null; // Store the fetched user object (includes profile)
    isLoading: boolean; // Indicates if auth state is being checked
    login: (credentials: { username: string; password: string }) => Promise<void>;
    logout: () => void;
    checkAuth: () => Promise<void>; // Function to check auth status
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [user, setUser] = useState<User | null>(null); // State now holds User type
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Helper function to fetch user data and update state
    const fetchAndSetUser = useCallback(async (): Promise<boolean> => {
        console.log("Attempting to fetch user details...");
        // Check if we even have a token before attempting fetch
        if (!tokenStorage.getAccessToken()) {
            console.log("No access token found, cannot fetch user.");
            setUser(null);
            setIsAuthenticated(false);
            return false;
        }
        try {
            const userData = await getCurrentUser(); // Call the API function
            console.log("User details fetched:", userData);
            setUser(userData); // Store the fetched user object
            setIsAuthenticated(true); // Mark as authenticated
            return true; // Indicate success
        } catch (error: any) {
            console.error("Failed to fetch user details in context:", error);
            // Check if the error is a 401 Unauthorized, which might indicate an expired token
            // The interceptor should handle refresh, but this is a fallback.
            if (error.response?.status !== 401) {
                // If it's not a 401, clear the user state as something else is wrong.
                // For 401, the interceptor will try to refresh or log out.
                setUser(null);
                setIsAuthenticated(false);
                // Optionally clear tokens if fetch fails for non-401 reason with a token present?
                // tokenStorage.clearTokens(); // Maybe too aggressive?
            }
            // We don't clear tokens or set auth false here for 401, let interceptor handle it
            return false; // Indicate failure
        }
    }, []);

    const checkAuth = useCallback(async () => {
        console.log("checkAuth called");
        setIsLoading(true);

        // Attempt to fetch user details. This implicitly checks the access token.
        // The API interceptor will handle refreshing if the access token is expired.
        const success = await fetchAndSetUser();

        if (!success) {
            // If fetchAndSetUser failed (could be due to no tokens, invalid tokens,
            // or failed refresh attempt by interceptor), ensure state is logged out.
            console.log("Initial user fetch failed, ensuring logged out state.");
            setUser(null);
            setIsAuthenticated(false);
            // Clear tokens if they weren't already cleared by interceptor/refresh logic
            if (tokenStorage.getAccessToken() || tokenStorage.getRefreshToken()) {
                tokenStorage.clearTokens();
            }
        }

        setIsLoading(false);
        console.log("checkAuth finished. isAuthenticated:", success);

    }, [fetchAndSetUser]); // Dependency on the memoized fetch function

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const login = useCallback(async (credentials: { username: string; password: string }) => {
        console.log("Login function called");
        setIsLoading(true);
        try {
            await apiLogin(credentials); // Attempt API login (saves tokens on success)
            console.log("API login successful, fetching user details...");
            // Fetch user data immediately after successful API login
            const loginSuccess = await fetchAndSetUser(); // Sets user and isAuthenticated state
            if (!loginSuccess) {
                // Should not happen if login API succeeded, but handle defensively
                throw new Error("Login succeeded but failed to fetch user data.");
            }
        } catch (error) {
            console.error('Login process failed:', error);
            tokenStorage.clearTokens(); // Ensure tokens are cleared on login failure
            setUser(null);
            setIsAuthenticated(false);
            throw error; // Re-throw error for the LoginPage component to handle UI feedback
        } finally {
            setIsLoading(false);
        }
    }, [fetchAndSetUser]);

    const logout = useCallback(() => {
        console.log("Logout function called");
        setIsAuthenticated(false);
        setUser(null);
        tokenStorage.clearTokens();
        // Use navigate hook or window.location to redirect
        // window.location.href = '/login'; // Force reload
        // Consider using useNavigate hook from react-router-dom if available in this scope
        // Or trigger navigation from where logout is called.
        // For simplicity here, we stick with window.location
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
    }, []);

    const contextValue = useMemo(() => ({
        isAuthenticated,
        user, // User object now includes profile
        isLoading,
        login,
        logout,
        checkAuth,
    }), [isAuthenticated, user, isLoading, login, logout, checkAuth]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};
