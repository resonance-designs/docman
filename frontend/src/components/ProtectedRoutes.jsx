/*
 * @name Protected Routes Component
 * @file /docman/frontend/src/components/ProtectedRoutes.jsx
 * @component ProtectedRoutes
 * @description Route protection component for handling authentication and authorization
 * @author Richard Bakos
 * @version 2.0.2
 * @license UNLICENSED
 */
import { Navigate } from "react-router";

/**
 * Protected route component that redirects unauthenticated users to login
 * @param {Object} props - Component properties
 * @param {boolean} props.isAuthenticated - Whether the user is authenticated
 * @param {React.ReactNode} props.children - Child components to render if authenticated
 * @returns {JSX.Element} The protected route component or redirect
 */
function ProtectedRoute({ isAuthenticated, children }) {
    if (!isAuthenticated) {
        // Redirect to login page if not authenticated
        return <Navigate to="/" replace />;
    }
    return children;
}

export default ProtectedRoute;
