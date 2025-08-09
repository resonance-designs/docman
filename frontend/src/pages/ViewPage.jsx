import { useState, useEffect } from "react";
import RateLimitedUI from "../components/RateLimitedUI";
import api from "../lib/axios";
// import toast from "react-hot-toast"; # Not sure if this is needed here
import DocCard from "../components/DocCard";
import DocTable from "../components/DocTable";
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
                <div className="relative flex flex-col w-full h-full overflow-scroll text-gray-700 bg-white shadow-md rounded-xl bg-clip-border">
                    <table className="w-full text-left table-auto min-w-max border-b border-resdes-orange">
                        <thead className="bg-resdes-orange text-slate-950 font-mono font-bold">
                            <tr>
                                <th className="p-4">
                                    <p className="block text-sm antialiased leading-none">
                                        Title
                                    </p>
                                </th>
                                <th className="p-4">
                                    <p className="block text-sm antialiased leading-none">
                                        Author
                                    </p>
                                </th>
                                <th className="p-4">
                                    <p className="block text-sm antialiased leading-none">
                                        Added On
                                    </p>
                                </th>
                                <th className="p-4">
                                    <p className="block text-sm antialiased leading-none">
                                        Actions
                                    </p>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="border border-resdes-orange">
                            {docs.map((doc) => (
                                <DocTable key={doc._id} doc={doc} setDocs={setDocs} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
export default HomePage;