/*
 * @name SystemInfoPage
 * @file /docman/frontend/src/pages/SystemInfoPage.jsx
 * @page SystemInfoPage
 * @description System information dashboard displaying server status, database info, and application metrics
 * @author Richard Bakos
 * @version 2.1.2
 * @license UNLICENSED
 */
import { useEffect, useState } from "react";
import { ServerIcon, DatabaseIcon, MonitorIcon, ShieldIcon } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";
import LoadingSpinner from "../components/LoadingSpinner";

const SystemInfoPage = () => {
    const [systemInfo, setSystemInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    // Helper function to format memory usage object
    const formatMemoryUsage = (memUsage) => {
        if (!memUsage || typeof memUsage !== 'object') return 'N/A';
        return `RSS: ${memUsage.rss}, Heap: ${memUsage.heapUsed}/${memUsage.heapTotal}`;
    };

    useEffect(() => {
        const fetchSystemInfo = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("token");
                const headers = { Authorization: `Bearer ${token}` };

                const res = await api.get("/system/info", { headers });
                setSystemInfo(res.data);
            } catch (error) {
                console.error("Error fetching system info:", error);
                toast.error("Failed to load system information");
            } finally {
                setLoading(false);
            }
        };

        fetchSystemInfo();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center text-resdes-teal py-10">
                        <LoadingSpinner 
                            message="Loading system information..." 
                            size="lg" 
                            color="red" 
                        />
                    </div>
                </div>
            </div>
        );
    }

    if (!systemInfo) {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center py-8">
                        <p className="text-base-content text-lg">Unable to load system information.</p>
                    </div>
                </div>
            </div>
        );
    }

    const InfoCard = ({ icon: Icon, title, children }) => (
        <div className="card bg-base-100">
            <div className="card-body">
                <div className="flex items-center gap-3 mb-4">
                    <Icon className="size-6 text-resdes-orange" />
                    <h3 className="text-xl font-bold text-base-content">{title}</h3>
                </div>
                <div className="space-y-3">
                    {children}
                </div>
            </div>
        </div>
    );

    const InfoRow = ({ label, value, status }) => (
        <div className="flex justify-between items-center py-2 border-b border-base-300 last:border-b-0">
            <span className="font-medium text-base-content">{label}:</span>
            <div className="flex items-center gap-2">
                <span className="text-base-content">{value}</span>
                {status && (
                    <span className={`badge ${status === 'healthy' ? 'badge-success' : status === 'warning' ? 'badge-warning' : 'badge-error'}`}>
                        {status}
                    </span>
                )}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-4">
                <div className="max-w-screen-xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <MonitorIcon className="size-8 text-resdes-orange" />
                        <h1 className="text-4xl font-bold text-base-content">System Information</h1>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Server Information */}
                        <InfoCard icon={ServerIcon} title="Server Information">
                            <InfoRow label="Environment" value={systemInfo.environment} />
                            <InfoRow label="Node.js Version" value={systemInfo.nodeVersion} />
                            <InfoRow label="Server Port" value={systemInfo.port} />
                            <InfoRow label="Operating System" value={systemInfo.os} />
                            <InfoRow label="Platform" value={systemInfo.platform} />
                            <InfoRow label="Architecture" value={systemInfo.architecture} />
                            <InfoRow label="Uptime" value={systemInfo.uptime} />
                            <InfoRow label="Memory Usage" value={formatMemoryUsage(systemInfo.memoryUsage)} />
                        </InfoCard>

                        {/* Database Information */}
                        <InfoCard icon={DatabaseIcon} title="Database Information">
                            <InfoRow label="Database Type" value={systemInfo.database?.type || 'MongoDB'} />
                            <InfoRow label="Connection Status" value={systemInfo.database?.status} status={systemInfo.database?.status?.toLowerCase()} />
                            <InfoRow label="Database Name" value={systemInfo.database?.name} />
                            <InfoRow label="Host" value={systemInfo.database?.host} />
                            <InfoRow label="Collections" value={systemInfo.database?.collections} />
                            <InfoRow label="Total Documents" value={systemInfo.database?.totalDocuments} />
                        </InfoCard>

                        {/* Application Information */}
                        <InfoCard icon={ShieldIcon} title="Application Information">
                            <InfoRow label="Application Name" value={systemInfo.app?.name || 'DocMan'} />
                            <InfoRow label="Version" value={systemInfo.app?.version || '1.0.0'} />
                            <InfoRow label="Build Date" value={systemInfo.app?.buildDate} />
                            <InfoRow label="Frontend URL" value={systemInfo.app?.frontendUrl} />
                            <InfoRow label="API Base URL" value={systemInfo.app?.apiBaseUrl} />
                            <InfoRow label="File Upload Path" value={systemInfo.app?.uploadPath} />
                        </InfoCard>

                        {/* System Health */}
                        <InfoCard icon={MonitorIcon} title="System Health">
                            <InfoRow label="CPU Usage" value={systemInfo.health?.cpuUsage} status={systemInfo.health?.cpuStatus} />
                            <InfoRow label="Memory Usage" value={systemInfo.health?.memoryPercentage} status={systemInfo.health?.memoryStatus} />
                            <InfoRow label="Disk Usage" value={systemInfo.health?.diskUsage} status={systemInfo.health?.diskStatus} />
                            <InfoRow label="Load Average" value={systemInfo.health?.loadAverage} />
                            <InfoRow label="Active Connections" value={systemInfo.health?.activeConnections} />
                            <InfoRow label="Last Health Check" value={systemInfo.health?.lastCheck} />
                        </InfoCard>
                    </div>

                    {/* Additional Information */}
                    {systemInfo.additional && (
                        <div className="mt-6">
                            <div className="card bg-base-100">
                                <div className="card-body">
                                    <h3 className="text-lg font-bold text-base-content mb-4">Additional Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {Object.entries(systemInfo.additional).map(([key, value]) => (
                                            <div key={key} className="bg-base-300 rounded-lg p-3">
                                                <div className="text-sm font-medium text-base-content capitalize">
                                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                                </div>
                                                <div className="text-base font-semibold text-base-content">
                                                    {typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : String(value)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SystemInfoPage;
