/*
 * @author Richard Bakos
 * @version 2.0.0
 * @license UNLICENSED
 */
import axios from "axios";

/**
 * Base URL for API requests - dynamic based on environment
 * In development: localhost:5001/api, in production: /api
 */
const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5001/api" : "/api";

/**
 * Configured axios instance with base URL and request interceptor
 * Automatically adds Authorization header with JWT token if available
 */
const api = axios.create({
    baseURL: BASE_URL,
});

/**
 * Request interceptor to automatically add Authorization header
 * Gets JWT token from localStorage and adds it to all requests
 */
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        // console.log("🔑 Sending request to:", config.url, "with token:", token.substring(0, 20) + "...");
    }
    return config;
});

/**
 * Response interceptor to handle authentication errors
 */
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.error("🔒 Authentication failed - clearing expired token");

            // Clear expired token from localStorage
            const currentToken = localStorage.getItem("token");
            if (currentToken) {
                localStorage.removeItem("token");

                // Dispatch event to update auth state
                window.dispatchEvent(new Event('authStateChanged'));

                // Optionally redirect to login
                if (window.location.pathname !== '/') {
                    window.location.href = '/';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;