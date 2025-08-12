import { Navigate } from "react-router";

function ProtectedRoute({ isAuthenticated, children }) {
    if (!isAuthenticated) {
        // Redirect to login page if not authenticated
        return <Navigate to="/" replace />;
    }
    return children;
}

export default ProtectedRoute;
