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
    refreshToken as apiRefreshToken,
    getCurrentUser 
} from '../services/api';
import { User } from '../types';

interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null; 
    isLoading: boolean; 
    login: (credentials: { username: string; password: string }) => Promise<void>;
    logout: () => void;
    checkAuth: () => Promise<void>; 
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [user, setUser] = useState<User | null>(null); 
    const [isLoading, setIsLoading] = useState<boolean>(true); 

    const fetchAndSetUser = useCallback(async () => {
        console.log("Attempting to fetch user details...");
        try {
            const userData = await getCurrentUser(); 
            console.log("User details fetched:", userData);
            setUser(userData); 
            setIsAuthenticated(true); 
            return true; 
        } catch (error) {
            console.error("Failed to fetch user details in context:", error);
            setUser(null); 
            setIsAuthenticated(false); 
            tokenStorage.clearTokens(); 
            return false; 
        }
    }, []); 

    const checkAuth = useCallback(async () => {
        console.log("checkAuth called");
        setIsLoading(true); 
        const accessToken = tokenStorage.getAccessToken();
        const refreshTokenVal = tokenStorage.getRefreshToken(); 

        let authSuccess = false;

        if (accessToken) {
            console.log("Access token found, attempting to fetch user...");

            authSuccess = await fetchAndSetUser(); 

            if (!authSuccess && refreshTokenVal) {
                console.warn("User fetch failed with access token, trying refresh...");
                try {
                    const newAccessToken = await apiRefreshToken();
                    if (newAccessToken) {
                        console.log("Token refresh successful, fetching user again...");

                        authSuccess = await fetchAndSetUser();
                    } else {
                        console.log("Token refresh failed (no new token returned).");

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

                console.log("User fetch failed, no refresh token to try.");
                tokenStorage.clearTokens(); 
                setUser(null);
                setIsAuthenticated(false);
            }
        } else if (refreshTokenVal) {

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

            console.log("No tokens found.");
            setUser(null);
            setIsAuthenticated(false);
        }

        if (!authSuccess) {
            setUser(null);
            setIsAuthenticated(false);
        }

        setIsLoading(false); 
        console.log("checkAuth finished. isAuthenticated:", authSuccess);
    }, [fetchAndSetUser]); 

    useEffect(() => {
        checkAuth();
    }, [checkAuth]); 

    const login = useCallback(async (credentials: { username: string; password: string }) => {
        console.log("Login function called");
        setIsLoading(true); 
        try {
            await apiLogin(credentials); 
            console.log("API login successful, fetching user details...");

            await fetchAndSetUser(); 
        } catch (error) {
            console.error('Login process failed:', error);
            tokenStorage.clearTokens(); 
            setUser(null);
            setIsAuthenticated(false);
            throw error; 
        } finally {
            setIsLoading(false); 
        }
    }, [fetchAndSetUser]); 

    const logout = useCallback(() => {
        console.log("Logout function called");
        setIsAuthenticated(false);
        setUser(null);
        tokenStorage.clearTokens();

        window.location.href = '/login';
    }, []); 

    const contextValue = useMemo(() => ({
        isAuthenticated,
        user,
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
