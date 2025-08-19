/*
 * @name Document Not Found Component
 * @file /docman/frontend/src/components/DocNotFound.jsx
 * @component DocNotFound
 * @description Empty state component displayed when no documents are found with call-to-action
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
import { NotebookIcon } from "lucide-react";
import { Link } from "react-router";

/**
 * Component displayed when no documents are found, encouraging users to create their first document
 * @returns {JSX.Element} The no documents found component
 */
const DocsNotFound = () => {
    return (
        <div className="flex flex-col items-center justify-center py-16 space-y-6 max-w-md mx-auto text-center">
            <div className="bg-resdes-orange/10 rounded-full p-8">
                <NotebookIcon className="size-10 text-resdes-orange" />
            </div>
            <h3 className="text-2xl font-bold">No documents yet</h3>
            <p className="text-base-content/70">
                Ready to add to the library? Create your first document to get started on your journey.
            </p>
            <Link to="/create" className="btn bg-resdes-orange text-slate-950 hover:bg-resdes-orange hover:opacity-[.8] transition-opacity duration-300">
                Create Your First Document
            </Link>
        </div>
    );
};
export default DocsNotFound;



