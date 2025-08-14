/*
 * @author Richard Bakos
 * @version 1.1.10
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
    }
    return config;
});

export default api;