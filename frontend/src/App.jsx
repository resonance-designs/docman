import { Route, Routes } from "react-router";
import HomePage from "./pages/HomePage";
// import ViewPage from "./pages/ViewPage";
import CreatePage from "./pages/CreatePage";
import DocDetailsPage from "./pages/DocDetailsPage";
import LoginPage from "./pages/LoginPage";
import RegPage from "./pages/RegPage";
import ForgotPassPage from "./pages/ForgotPassPage";
import ResetPassPage from "./pages/ResetPassPage";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from './components/ProtectedRoutes';

const App = () => {
    const isAuthenticated = !!localStorage.getItem("token"); // example check

    return (
        <div className="relative h-full w-full">
            <div className="absolute inset-0 -z-10 h-full w-full items-center px-5 py-24 [background:radial-gradient(125%_125%_at_50%_10%,#000_60%,#DF6D20_100%)]" />
            <Navbar />
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
                            <CreatePage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/doc/:id"
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <DocDetailsPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/register"
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <RegPage />
                        </ProtectedRoute>
                    }
                />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot" element={<ForgotPassPage />} />
                <Route path="/reset" element={<ResetPassPage />} />
            </Routes>
            <Footer />
        </div>
    );
}
export default App
