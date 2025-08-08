import { useState } from "react";
import Navbar from "../components/Navbar";
import RateLimitedUI from "../components/RateLimitedUI";
import { useEffect } from "react";
import api from "../lib/axios";
import toast from "react-hot-toast";
import DocCard from "../components/DocCard";
import DocsNotFound from "../components/DocsNotFound";

const HomePage = () => {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await api.get("/docs");
        console.log(res.data);
        setDocs(res.data);
        setIsRateLimited(false);
      } catch (error) {
        console.log("Error fetching documents");
        console.log(error.response);
        if (error.response?.status === 429) {
          setIsRateLimited(true);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDocs();
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />

      {isRateLimited && <RateLimitedUI />}

      <div className="max-w-7xl mx-auto p-4 mt-6">
        {loading && <div className="text-center text-primary py-10">Loading docs...</div>}

        {docs.length === 0 && !isRateLimited && <DocsNotFound />}

        {docs.length > 0 && !isRateLimited && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {docs.map((doc) => (
              <DocCard key={doc._id} doc={doc} setDocs={setDocs} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default HomePage;