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
// Import the API functions needed
import {
    login as apiLogin,
    refreshToken as apiRefreshToken,
    getCurrentUser // Import the function to get user details
} from '../services/api';
import { User } from '../types'; // Import the User type

// Define the shape of the context value
interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null; // Store the fetched user object
    isLoading: boolean; // Indicates if auth state is being checked
    login: (credentials: { username: string; password: string }) => Promise<void>;
    logout: () => void;
    checkAuth: () => Promise<void>; // Function to check auth status on initial load or refresh
}

// Create the context with an initial undefined value
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define props for the provider component
interface AuthProviderProps {
    children: ReactNode;
}

// AuthProvider component manages the authentication state
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [user, setUser] = useState<User | null>(null); // State to store user data
    const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading until initial check is done

    // Helper function to fetch user data and update state
    const fetchAndSetUser = useCallback(async () => {
        console.log("Attempting to fetch user details...");
        try {
            const userData = await getCurrentUser(); // Call the API function
            console.log("User details fetched:", userData);
            setUser(userData); // Store the fetched user object
            setIsAuthenticated(true); // Mark as authenticated
            return true; // Indicate success
        } catch (error) {
            console.error("Failed to fetch user details in context:", error);
            setUser(null); // Clear user data on failure
            setIsAuthenticated(false); // Mark as not authenticated
            tokenStorage.clearTokens(); // Clear potentially invalid tokens
            return false; // Indicate failure
        }
    }, []); // No dependencies needed for this specific helper

    // Function to check authentication status (e.g., on page load)
    const checkAuth = useCallback(async () => {
        console.log("checkAuth called");
        setIsLoading(true); // Start loading
        const accessToken = tokenStorage.getAccessToken();
        const refreshTokenVal = tokenStorage.getRefreshToken(); // Renamed to avoid conflict

        let authSuccess = false;

        if (accessToken) {
            console.log("Access token found, attempting to fetch user...");
            // Try fetching user directly with existing access token
            authSuccess = await fetchAndSetUser(); // This sets user and isAuthenticated

            // If fetching user failed AND we have a refresh token, try refreshing
            if (!authSuccess && refreshTokenVal) {
                console.warn("User fetch failed with access token, trying refresh...");
                try {
                    const newAccessToken = await apiRefreshToken();
                    if (newAccessToken) {
                        console.log("Token refresh successful, fetching user again...");
                        // If refresh successful, try fetching user again with the new token
                        authSuccess = await fetchAndSetUser();
                    } else {
                        console.log("Token refresh failed (no new token returned).");
                        // Refresh failed, clear tokens
                        tokenStorage.clearTokens();
                        setUser(null);
                        setIsAuthenticated(false);
                    }
                } catch (refreshError) {
                    console.error("Refresh failed during initial check:", refreshError);
                    tokenStorage.clearTokens();
                    setUser(null);
                    setIsAuthenticated(false);
                }
            } else if (!authSuccess) {
                // Access token existed but user fetch failed, and no refresh token to try
                console.log("User fetch failed, no refresh token to try.");
                tokenStorage.clearTokens(); // Clear the invalid access token
                setUser(null);
                setIsAuthenticated(false);
            }
        } else if (refreshTokenVal) {
            // Only refresh token exists, try refreshing
            console.log("No access token, trying refresh...");
            try {
                const newAccessToken = await apiRefreshToken();
                if (newAccessToken) {
                    console.log("Token refresh successful (from refresh only), fetching user...");
                    authSuccess = await fetchAndSetUser();
                } else {
                    console.log("Token refresh failed (no new token returned from refresh only).");
                    tokenStorage.clearTokens();
                    setUser(null);
                    setIsAuthenticated(false);
                }
            } catch (refreshError) {
                console.error("Refresh failed during initial check (no access token):", refreshError);
                tokenStorage.clearTokens();
                setUser(null);
                setIsAuthenticated(false);
            }
        } else {
            // No tokens found
            console.log("No tokens found.");
            setUser(null);
            setIsAuthenticated(false);
        }

        // If all attempts failed ensure state reflects it
        if (!authSuccess) {
            setUser(null);
            setIsAuthenticated(false);
        }

        setIsLoading(false); // Finish loading
        console.log("checkAuth finished. isAuthenticated:", authSuccess);
    }, [fetchAndSetUser]); // Add fetchAndSetUser as a dependency

    // Run checkAuth once when the component mounts
    useEffect(() => {
        checkAuth();
    }, [checkAuth]); // Dependency array ensures it runs once on mount

    // Login function
    const login = useCallback(async (credentials: { username: string; password: string }) => {
        console.log("Login function called");
        setIsLoading(true); // Indicate loading during login process
        try {
            await apiLogin(credentials); // Attempt API login (saves tokens on success)
            console.log("API login successful, fetching user details...");
            // Fetch user data immediately after successful API login
            await fetchAndSetUser(); // Sets user and isAuthenticated state
        } catch (error) {
            console.error('Login process failed:', error);
            tokenStorage.clearTokens(); // Ensure tokens are cleared on login failure
            setUser(null);
            setIsAuthenticated(false);
            throw error; // Re-throw error for the LoginPage component to handle UI feedback
        } finally {
            setIsLoading(false); // Finish loading state
        }
    }, [fetchAndSetUser]); // Add fetchAndSetUser as a dependency

    // Logout function
    const logout = useCallback(() => {
        console.log("Logout function called");
        setIsAuthenticated(false);
        setUser(null);
        tokenStorage.clearTokens();
        // Redirect to login page - using window.location forces a full page reload,
        // which can be helpful to clear any residual state.
        window.location.href = '/login';
    }, []); // No dependencies needed

    // Memoize the context value to prevent unnecessary re-renders of consumers
    const contextValue = useMemo(() => ({
        isAuthenticated,
        user,
        isLoading,
        login,
        logout,
        checkAuth,
    }), [isAuthenticated, user, isLoading, login, logout, checkAuth]);

    // Provide the context value to child components
    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};
