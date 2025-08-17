/*
 * @name ThemeContext
 * @file /docman/frontend/src/context/ThemeContext.jsx
 * @context ThemeContext
 * @description React context for managing application theme state with persistence and user preferences
 * @author Richard Bakos
 * @version 2.1.2
 * @license UNLICENSED
 */
import { createContext, useContext, useState, useEffect } from "react";
import { themes, getThemeClass, isValidTheme } from "../themes";
import api from "../lib/axios";
import { decodeJWT } from "../lib/utils";

// Helper function to get cookie value
const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
};

// Helper function to set cookie
const setCookie = (name, value, days = 30) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

// Create the Theme Context
const ThemeContext = createContext();

// Custom hook to use the Theme Context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

// Theme Provider Component
export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState("current");
  const [loading, setLoading] = useState(true);

  // Load user's theme preference from backend or cookie
  const loadUserTheme = async () => {
    try {
      // First, try to get theme from cookie
      const cookieTheme = getCookie("theme");
      if (cookieTheme && isValidTheme(cookieTheme)) {
        setCurrentTheme(cookieTheme);
      }

      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      const decoded = decodeJWT(token);
      const userId = decoded?.id || decoded?._id || decoded?.userId || decoded?.sub;
      
      if (!userId) {
        setLoading(false);
        return;
      }

      const response = await api.get(`/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const userTheme = response.data.theme;
      if (userTheme && isValidTheme(userTheme)) {
        setCurrentTheme(userTheme);
        // Save to cookie as well
        setCookie("theme", userTheme);
      }
    } catch (error) {
      console.error("Error loading user theme:", error);
    } finally {
      setLoading(false);
    }
  };

  // Save user's theme preference to backend and cookie
  const saveUserTheme = async (theme) => {
    try {
      // Always save to cookie
      setCookie("theme", theme);
      
      const token = localStorage.getItem("token");
      if (!token) {
        setCurrentTheme(theme);
        return;
      }

      const decoded = decodeJWT(token);
      const userId = decoded?.id || decoded?._id || decoded?.userId || decoded?.sub;
      
      if (!userId) {
        setCurrentTheme(theme);
        return;
      }

      await api.put(`/users/${userId}`, { theme }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setCurrentTheme(theme);
    } catch (error) {
      console.error("Error saving user theme:", error);
      throw error;
    }
  };

  // Initialize theme on component mount
  useEffect(() => {
    loadUserTheme();
  }, []);

  // Apply theme class to body element
  useEffect(() => {
    const body = document.body;
    const themeClass = getThemeClass(currentTheme);
    
    // Remove all theme classes
    Object.values(themes).forEach(theme => {
      body.classList.remove(theme.class);
    });
    
    // Add current theme class
    body.classList.add(themeClass);
  }, [currentTheme]);

  const value = {
    currentTheme,
    setCurrentTheme: saveUserTheme,
    loading
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};