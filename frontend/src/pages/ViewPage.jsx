/*
 * @author Richard Bakos
 * @version 2.0.0
 * @license UNLICENSED
 */
import { useState, useEffect } from "react";
import RateLimitedUI from "../components/RateLimitedUI";
import api from "../lib/axios";
// import toast from "react-hot-toast"; # Not sure if this is needed here
import DocCard from "../components/DocCard";
import PaginatedDocTable from "../components/PaginatedDocTable";
import DocsNotFound from "../components/DocsNotFound";

/**
 * Page component for viewing documents that need review
 * @returns {JSX.Element} The view page component
 */
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
            {isRateLimited && <RateLimitedUI />}
            <div className="max-w-screen-lg mx-auto mt-6">
                <h2 className="text-3xl mb-6">Documents That Need Review</h2>
                {loading && <div className="text-center text-resdes-teal py-10">Loading docs...</div>}
                {docs.length === 0 && !isRateLimited && <DocsNotFound />}
                {docs.length > 0 && !isRateLimited && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    {docs.map((doc) => (
                        <DocCard key={doc._id} doc={doc} setDocs={setDocs} />
                    ))}
                </div>)}
                <h2 className="text-3xl mb-6">All Documents</h2>
                <PaginatedDocTable docs={docs} setDocs={setDocs} itemsPerPage={10} />
            </div>
        </div>
    );
};
export default HomePage;