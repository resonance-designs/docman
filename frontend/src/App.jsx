import { Route, Routes } from "react-router";
import { useState, useEffect } from "react";
import HomePage from "./pages/HomePage";
import ViewDocPage from "./pages/ViewDocPage";
import ViewDocsPage from "./pages/ViewDocsPage";
import ViewCatsPage from "./pages/ViewCatsPage";
import ViewUsersPage from "./pages/ViewUsersPage";
import MyProfilePage from "./pages/MyProfilePage";
import ViewUserPage from "./pages/ViewUserPage";
import SystemInfoPage from "./pages/SystemInfoPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import CreateDocPage from "./pages/CreateDocPage";
import CreateCatPage from './pages/CreateCatPage';
import EditDocPage from "./pages/EditDocPage";
import CustomChartsPage from "./pages/CustomChartsPage";
import TeamsPage from "./pages/TeamsPage";
import TeamDetailPage from "./pages/TeamDetailPage";
import ProjectsPage from "./pages/ProjectsPage";
import CreateProjectPage from "./pages/CreateProjectPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import EditProjectPage from "./pages/EditProjectPage";
import EditTeamPage from "./pages/EditTeamPage";
import LoginPage from "./pages/LoginPage";
import RegUserPage from "./pages/RegUserPage";
import ForgotPassPage from "./pages/ForgotPassPage";
import ResetPassPage from "./pages/ResetPassPage";
import Navbar from "./components/Navbar";
import NavAdmin from "./components/NavAdmin";
import Footer from "./components/Footer";
import ProtectedRoute from './components/ProtectedRoutes';
import { decodeJWT } from "./lib/utils";
import ManageExternalContactTypesPage from "./pages/ManageExternalContactTypesPage";
import { ThemeProvider } from "./context/ThemeContext";

const App = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("token"));
    const [userRole, setUserRole] = useState(null);

    // Get user role from token
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const decoded = decodeJWT(token);
                setUserRole(decoded?.role);
                setIsAuthenticated(true);
            } catch (error) {
                console.error("Invalid token:", error);
                setIsAuthenticated(false);
                setUserRole(null);
            }
        } else {
            setIsAuthenticated(false);
            setUserRole(null);
        }
    }, []);

    // Listen for auth state changes
    useEffect(() => {
        const handleAuthChange = () => {
            const token = localStorage.getItem("token");
            if (token) {
                try {
                    const decoded = decodeJWT(token);
                    setUserRole(decoded?.role);
                    setIsAuthenticated(true);
                } catch (error) {
                    console.error("Invalid token:", error);
                    setIsAuthenticated(false);
                    setUserRole(null);
                }
            } else {
                setIsAuthenticated(false);
                setUserRole(null);
            }
        };

        window.addEventListener("authStateChanged", handleAuthChange);
        return () => window.removeEventListener("authStateChanged", handleAuthChange);
    }, []);

    return (
        <ThemeProvider>
            <div className="relative h-full w-full">
                <div className="absolute inset-0 -z-10 h-full w-full items-center px-5 py-24 bg-gradient-bg" />
                <Navbar />
                {isAuthenticated && (
                    <div className="container mx-auto px-4 pt-4">
                        <div className="max-w-screen-xl mx-auto mt-8">
                            <NavAdmin role={userRole} />
                        </div>
                    </div>
                )}
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    {/* Protected routes */}
                    {/* <Route
                        path="/view"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <ViewPage />
                            </ProtectedRoute>
                        }
                    /> */}
                    <Route
                        path="/create"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <CreateDocPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/create-category"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <CreateCatPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/doc/:id"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <ViewDocPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/edit/:id"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <EditDocPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/documents"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <ViewDocsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/categories"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <ViewCatsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/users"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <ViewUsersPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/teams"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <TeamsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/teams/:id"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <TeamDetailPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/teams/:id/edit"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <EditTeamPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/projects"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <ProjectsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/projects/create"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <CreateProjectPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/projects/:id"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <ProjectDetailPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/projects/:id/edit"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <EditProjectPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/my-profile"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <MyProfilePage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/user/:userId"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <ViewUserPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/edit-user/:userId"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <MyProfilePage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/system-info"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <SystemInfoPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/analytics"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <AnalyticsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/custom-charts"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <CustomChartsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/register"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <RegUserPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/forgot" element={<ForgotPassPage />} />
                    <Route path="/reset" element={<ResetPassPage />} />
                    <Route
                        path="/manage-external-contact-types"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <ManageExternalContactTypesPage />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
                <Footer />
            </div>
        </ThemeProvider>
    );
}

export default App;
