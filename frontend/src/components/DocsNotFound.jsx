import { NotebookIcon } from "lucide-react";
import { Link } from "react-router";

const DocsNotFound = () => {
    return (
        <div className="flex flex-col items-center justify-center py-16 space-y-6 max-w-md mx-auto text-center">
            <div className="bg-primary/10 rounded-full p-8">
                <NotebookIcon className="size-10 text-primary" />
            </div>
            <h3 className="text-2xl font-bold">No documents yet</h3>
            <p className="text-base-content/70">
                Ready to add to the library? Create your first document to get started on your journey.
            </p>
            <Link to="/create" className="btn btn-primary">
                Create Your First Document
            </Link>
        </div>
    );
};
export default DocsNotFound;



