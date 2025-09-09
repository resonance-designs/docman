/*
 * @name DangerZone
 * @file /docman/frontend/src/components/system/DangerZone.jsx
 * @component DangerZone
 * @description Danger zone section for system administration with collection clearing and restoration
 * @version 2.1.22
 * @license UNLICENSED
 */
import { useState } from "react";
import { AlertTriangleIcon, ArchiveIcon, RefreshCwIcon, DatabaseIcon, FileIcon } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../lib/axios";
import ConfirmActionModal from "./ConfirmActionModal";

/**
 * Danger zone section for system administration
 * @returns {JSX.Element} The danger zone component
 */
const DangerZone = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        title: "",
        message: "",
        actionName: "",
        action: null
    });
    const [isLoading, setIsLoading] = useState(false);

    // Collection definitions for clear/restore operations
    const collections = [
        { id: "books", name: "Books", icon: <DatabaseIcon className="w-4 h-4" /> },
        { id: "documents", name: "Documents", icon: <DatabaseIcon className="w-4 h-4" /> },
        { id: "charts", name: "Charts", icon: <DatabaseIcon className="w-4 h-4" /> },
        { id: "external_contacts", name: "External Contacts", icon: <DatabaseIcon className="w-4 h-4" /> },
        { id: "external_contact_types", name: "External Contact Types", icon: <DatabaseIcon className="w-4 h-4" /> },
        { id: "files", name: "Files", icon: <DatabaseIcon className="w-4 h-4" /> },
        { id: "notifications", name: "Notifications", icon: <DatabaseIcon className="w-4 h-4" /> },
        { id: "projects", name: "Projects", icon: <DatabaseIcon className="w-4 h-4" /> },
        { id: "review_assignments", name: "Review Assignments", icon: <DatabaseIcon className="w-4 h-4" /> },
        { id: "teams", name: "Teams", icon: <DatabaseIcon className="w-4 h-4" /> },
        { id: "users", name: "Users", icon: <DatabaseIcon className="w-4 h-4" /> },
        { id: "categories", name: "Categories", icon: <DatabaseIcon className="w-4 h-4" /> }
    ];

    /**
     * Open confirmation modal with specified configuration
     * @param {Object} config - Modal configuration
     */
    const openModal = (config) => {
        setModalConfig(config);
        setIsModalOpen(true);
    };

    /**
     * Close confirmation modal
     */
    const closeModal = () => {
        setIsModalOpen(false);
    };

    /**
     * Handle clear collection action
     * @param {string} collectionId - Collection identifier
     * @param {string} collectionName - Display name of the collection
     */
    const handleClearCollection = (collectionId, collectionName) => {
        openModal({
            title: `Clear ${collectionName}`,
            message: `Are you sure you want to clear all ${collectionName.toLowerCase()}? All data will be archived to a separate collection before deletion.`,
            actionName: `Clear ${collectionName}`,
            action: async () => {
                setIsLoading(true);
                try {
                    const token = localStorage.getItem("token");
                    const headers = { Authorization: `Bearer ${token}` };

                    const response = await api.post(`/system/clear/${collectionId}`, {}, { headers });

                    toast.success(response.data.message);
                } catch (error) {
                    console.error(`Error clearing ${collectionName}:`, error);
                    toast.error(`Failed to clear ${collectionName}: ${error.response?.data?.message || error.message}`);
                } finally {
                    setIsLoading(false);
                    closeModal();
                }
            }
        });
    };

    /**
     * Handle restore collection action
     * @param {string} collectionId - Collection identifier
     * @param {string} collectionName - Display name of the collection
     */
    const handleRestoreCollection = (collectionId, collectionName) => {
        openModal({
            title: `Restore ${collectionName}`,
            message: `Are you sure you want to restore all archived ${collectionName.toLowerCase()}? This will add all archived items back to the main collection.`,
            actionName: `Restore ${collectionName}`,
            action: async () => {
                setIsLoading(true);
                try {
                    const token = localStorage.getItem("token");
                    const headers = { Authorization: `Bearer ${token}` };

                    const response = await api.post(`/system/restore/${collectionId}`, {}, { headers });

                    toast.success(response.data.message);
                } catch (error) {
                    console.error(`Error restoring ${collectionName}:`, error);
                    toast.error(`Failed to restore ${collectionName}: ${error.response?.data?.message || error.message}`);
                } finally {
                    setIsLoading(false);
                    closeModal();
                }
            }
        });
    };

    /**
     * Handle archive files action
     */
    const handleArchiveFiles = () => {
        openModal({
            title: "Archive Upload Files",
            message: "Are you sure you want to archive all files in the uploads directory? Files will be moved to an archive directory.",
            actionName: "Archive Files",
            action: async () => {
                setIsLoading(true);
                try {
                    const token = localStorage.getItem("token");
                    const headers = { Authorization: `Bearer ${token}` };

                    const response = await api.post("/system/archive-files", {}, { headers });

                    toast.success(response.data.message);
                } catch (error) {
                    console.error("Error archiving files:", error);
                    toast.error(`Failed to archive files: ${error.response?.data?.message || error.message}`);
                } finally {
                    setIsLoading(false);
                    closeModal();
                }
            }
        });
    };

    /**
     * Handle restore files action
     */
    const handleRestoreFiles = () => {
        openModal({
            title: "Restore Archived Files",
            message: "Are you sure you want to restore all archived files? Files will be moved back to the uploads directory.",
            actionName: "Restore Files",
            action: async () => {
                setIsLoading(true);
                try {
                    const token = localStorage.getItem("token");
                    const headers = { Authorization: `Bearer ${token}` };

                    const response = await api.post("/system/restore-files", {}, { headers });

                    toast.success(response.data.message);
                } catch (error) {
                    console.error("Error restoring files:", error);
                    toast.error(`Failed to restore files: ${error.response?.data?.message || error.message}`);
                } finally {
                    setIsLoading(false);
                    closeModal();
                }
            }
        });
    };

    /**
     * Handle generate dummy data action
     */
    const handleGenerateDummyData = () => {
        openModal({
            title: "Generate Dummy Data",
            message: "Are you sure you want to generate dummy data? This will create test data in various collections.",
            actionName: "Generate Data",
            action: async () => {
                setIsLoading(true);
                try {
                    const token = localStorage.getItem("token");
                    const headers = { Authorization: `Bearer ${token}` };

                    const response = await api.post("/system/generate-dummy-data", {}, { headers });

                    toast.success(response.data.message);
                } catch (error) {
                    console.error("Error generating dummy data:", error);
                    toast.error(`Failed to generate dummy data: ${error.response?.data?.message || error.message}`);
                } finally {
                    setIsLoading(false);
                    closeModal();
                }
            }
        });
    };

    /**
     * Handle clear all collections action
     */
    const handleClearAllCollections = () => {
        openModal({
            title: "Clear All Collections",
            message: "Are you sure you want to clear ALL collections? This will archive and then delete ALL data from ALL collections. This is an extremely destructive action.",
            actionName: "Clear All Collections",
            action: async () => {
                setIsLoading(true);
                try {
                    const token = localStorage.getItem("token");
                    const headers = { Authorization: `Bearer ${token}` };

                    // Process collections sequentially to avoid overwhelming the server
                    let successCount = 0;
                    let errorMessages = [];

                    for (const collection of collections) {
                        try {
                            await api.post(`/system/clear/${collection.id}`, {}, { headers });
                            successCount++;
                        } catch (error) {
                            console.error(`Error clearing ${collection.name}:`, error);
                            errorMessages.push(`${collection.name}: ${error.response?.data?.message || error.message}`);
                        }
                    }

                    if (errorMessages.length === 0) {
                        toast.success(`Successfully cleared all ${successCount} collections`);
                    } else {
                        toast.success(`Successfully cleared ${successCount} collections`);
                        errorMessages.forEach(msg => toast.error(msg));
                    }
                } catch (error) {
                    console.error("Error in clear all operation:", error);
                    toast.error(`Operation failed: ${error.message}`);
                } finally {
                    setIsLoading(false);
                    closeModal();
                }
            }
        });
    };

    /**
     * Handle restore all collections action
     */
    const handleRestoreAllCollections = () => {
        openModal({
            title: "Restore All Collections",
            message: "Are you sure you want to restore ALL archived collections? This will add all archived items back to their respective main collections.",
            actionName: "Restore All Collections",
            action: async () => {
                setIsLoading(true);
                try {
                    const token = localStorage.getItem("token");
                    const headers = { Authorization: `Bearer ${token}` };

                    // Process collections sequentially to avoid overwhelming the server
                    let successCount = 0;
                    let errorMessages = [];

                    for (const collection of collections) {
                        try {
                            await api.post(`/system/restore/${collection.id}`, {}, { headers });
                            successCount++;
                        } catch (error) {
                            console.error(`Error restoring ${collection.name}:`, error);
                            errorMessages.push(`${collection.name}: ${error.response?.data?.message || error.message}`);
                        }
                    }

                    if (errorMessages.length === 0) {
                        toast.success(`Successfully restored all ${successCount} collections`);
                    } else {
                        toast.success(`Successfully restored ${successCount} collections`);
                        errorMessages.forEach(msg => toast.error(msg));
                    }
                } catch (error) {
                    console.error("Error in restore all operation:", error);
                    toast.error(`Operation failed: ${error.message}`);
                } finally {
                    setIsLoading(false);
                    closeModal();
                }
            }
        });
    };

    return (
        <div className="mt-8">
            <div className="card bg-base-100 border-2 border-error">
                <div className="card-body">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertTriangleIcon className="w-6 h-6 text-error" />
                        <h3 className="text-xl font-bold text-error">Danger Zone</h3>
                    </div>

                    <div className="text-base-content mb-6">
                        <p className="text-sm text-error mb-2">
                            Warning: The actions below can result in data loss. Use with extreme caution.
                        </p>
                        <p className="text-sm">
                            These operations are designed for system maintenance and testing purposes.
                            All clear operations will archive data before deletion.
                        </p>
                    </div>

                    {/* Collection Management */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-lg font-semibold">Collection Management</h4>
                            <div className="flex gap-2">
                                <button
                                    className="btn btn-sm btn-error"
                                    onClick={handleClearAllCollections}
                                >
                                    <ArchiveIcon className="w-4 h-4 mr-1" />
                                    Clear All
                                </button>
                                <button
                                    className="btn btn-sm btn-outline"
                                    onClick={handleRestoreAllCollections}
                                >
                                    <RefreshCwIcon className="w-4 h-4 mr-1" />
                                    Restore All
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {collections.map((collection) => (
                                <div key={collection.id} className="card bg-base-200">
                                    <div className="card-body p-4">
                                        <h5 className="card-title text-base flex items-center gap-2">
                                            {collection.icon}
                                            {collection.name}
                                        </h5>
                                        <div className="card-actions justify-end mt-2">
                                            <button
                                                className="btn btn-xs btn-error"
                                                onClick={() => handleClearCollection(collection.id, collection.name)}
                                            >
                                                <ArchiveIcon className="w-3 h-3" />
                                                Clear
                                            </button>
                                            <button
                                                className="btn btn-xs btn-outline"
                                                onClick={() => handleRestoreCollection(collection.id, collection.name)}
                                            >
                                                <RefreshCwIcon className="w-3 h-3" />
                                                Restore
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* File Management */}
                    <div className="mb-6">
                        <h4 className="text-lg font-semibold mb-3">File Management</h4>
                        <div className="flex flex-wrap gap-4">
                            <div className="card bg-base-200">
                                <div className="card-body p-4">
                                    <h5 className="card-title text-base flex items-center gap-2">
                                        <FileIcon className="w-4 h-4" />
                                        Upload Files
                                    </h5>
                                    <p className="text-xs">Move files from uploads to archive directory</p>
                                    <div className="card-actions justify-end mt-2">
                                        <button
                                            className="btn btn-sm btn-error"
                                            onClick={handleArchiveFiles}
                                        >
                                            <ArchiveIcon className="w-4 h-4" />
                                            Archive Files
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="card bg-base-200">
                                <div className="card-body p-4">
                                    <h5 className="card-title text-base flex items-center gap-2">
                                        <FileIcon className="w-4 h-4" />
                                        Archived Files
                                    </h5>
                                    <p className="text-xs">Restore files from archive to uploads directory</p>
                                    <div className="card-actions justify-end mt-2">
                                        <button
                                            className="btn btn-sm btn-outline"
                                            onClick={handleRestoreFiles}
                                        >
                                            <RefreshCwIcon className="w-4 h-4" />
                                            Restore Files
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Data Generation */}
                    <div>
                        <h4 className="text-lg font-semibold mb-3">Data Generation</h4>
                        <div className="flex flex-wrap gap-4">
                            <div className="card bg-base-200">
                                <div className="card-body p-4">
                                    <h5 className="card-title text-base">Generate Dummy Data</h5>
                                    <p className="text-xs">Create test data for development and testing</p>
                                    <div className="card-actions justify-end mt-2">
                                        <button
                                            className="btn btn-sm btn-primary"
                                            onClick={handleGenerateDummyData}
                                        >
                                            Generate Data
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            <ConfirmActionModal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={modalConfig.title}
                message={modalConfig.message}
                actionName={modalConfig.actionName}
                onConfirm={modalConfig.action}
                isLoading={isLoading}
            />
        </div>
    );
};

export default DangerZone;