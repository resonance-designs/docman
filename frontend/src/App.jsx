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

const App = () => {
    return (
        <div className="relative h-full w-full">
            <div className="absolute inset-0 -z-10 h-full w-full items-center px-5 py-24 [background:radial-gradient(125%_125%_at_50%_10%,#000_60%,#DF6D20_100%)]" />
            <Navbar />
            <Routes>
                <Route path="/" element={<HomePage />} />
                {/* <Route path="/view" element={<ViewPage />} /> */}
                <Route path="/create" element={<CreatePage />} />
                <Route path="/doc/:id" element={<DocDetailsPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegPage />} />
                <Route path="/forgot" element={<ForgotPassPage />} />
                <Route path="/reset" element={<ResetPassPage />} />
            </Routes>
            <Footer />
        </div>
    );
}
export default App
