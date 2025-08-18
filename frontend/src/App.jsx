/*
 * @name App
 * @file /docman/frontend/src/App.jsx
 * @description Main application component that handles routing and authentication state
 * @author Richard Bakos
 * @version 2.1.4
 * @license UNLICENSED
 */
import { Route, Routes } from "react-router";
import React from "react";
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
import EditCatPage from './pages/EditCatPage';
import EditDocPage from "./pages/EditDocPage";
import ViewBooksPage from "./pages/ViewBooksPage";
import CreateBookPage from "./pages/CreateBookPage";
import ViewBookPage from "./pages/ViewBookPage";
import EditBookPage from "./pages/EditBookPage";
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
import ManageExternalContactTypesPage from "./pages/ManageExternalContactTypesPage";
import { ThemeProvider } from "./context/ThemeContext";
import { useUserRole } from "./hooks";
import ErrorBoundary from "./components/ErrorBoundary";
import InlineLoader from "./components/InlineLoader";

/**
 * Main application component that handles routing and authentication state
 * @returns {JSX.Element} The main application component
 */
const App = () => {
    console.log("🎯 App component starting...");

    const { isAuthenticated, userRole, loading } = useUserRole();
    console.log("🎯 App render:", { isAuthenticated, userRole, loading });

    // Show loading spinner during authentication check
    if (loading) {
        return (
            <ThemeProvider>
                <div className="min-h-screen bg-base-100 flex items-center justify-center">
                    <div className="loading loading-spinner loading-lg"></div>
                    <InlineLoader message="Loading..." size="sm" color="teal" />
                </div>
            </ThemeProvider>
        );
    }

    return (
        <ErrorBoundary>
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
                        path="/categories/:id/edit"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <EditCatPage />
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
                        path="/books"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <ViewBooksPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/books/create"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <CreateBookPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/books/:id"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <ViewBookPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/books/:id/edit"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <EditBookPage />
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
        </ErrorBoundary>
    );
}

export default App;
