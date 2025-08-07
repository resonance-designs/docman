import { Route, Routes } from "react-router";

import HomePage from "./pages/HomePage";
import CreatePage from "./pages/CreatePage";
import DocDetailsPage from "./pages/DocDetailsPage";
import toast from "react-hot-toast";

const App = () => {
  return (
    <div>
      <button className="btn btn-outline" onClick={() => toast.success("congrats")} >Click Me</button>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/doc/:id" element={<DocDetailsPage />} />
      </Routes>
    </div>
  );
}
export default App
