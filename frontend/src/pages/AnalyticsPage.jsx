/*
 * @name AnalyticsPage
 * @file /docman/frontend/src/pages/AnalyticsPage.jsx
 * @page AnalyticsPage
 * @description Analytics dashboard with charts and metrics for document management insights and reporting
 * @author Richard Bakos
 * @version 1.1.10
 * @license UNLICENSED
 */
import { useState, useEffect } from "react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    LineElement,
    PointElement
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { DownloadIcon, BarChart3Icon, TrendingUpIcon, PieChartIcon } from "lucide-react";
import * as XLSX from 'xlsx';
import api from "../lib/axios";
import toast from "react-hot-toast";

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    LineElement,
    PointElement
);

const AnalyticsPage = () => {
    const [analyticsData, setAnalyticsData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalyticsData();
    }, []);

    const fetchAnalyticsData = async () => {
        try {
            const response = await api.get('/analytics');
            setAnalyticsData(response.data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            toast.error('Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    };

    const downloadExcel = (chartType, data, filename) => {
        try {
            let worksheetData = [];

            switch (chartType) {
                case 'monthly':
                    worksheetData = data.map(item => ({
                        'Year': item._id.year,
                        'Month': getMonthName(item._id.month),
                        'Documents Created': item.count
                    }));
                    break;
                case 'category':
                    worksheetData = data.map(item => ({
                        'Category': item._id,
                        'Document Count': item.count
                    }));
                    break;
                case 'author':
                    worksheetData = data.map(item => ({
                        'Author': item._id.name,
                        'Email': item._id.email,
                        'Document Count': item.count
                    }));
                    break;
                case 'review':
                    worksheetData = data.map(item => ({
                        'Status': item._id,
                        'Document Count': item.count
                    }));
                    break;
                default:
                    return;
            }

            const worksheet = XLSX.utils.json_to_sheet(worksheetData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Analytics Data');
            XLSX.writeFile(workbook, `${filename}.xlsx`);
            toast.success('Excel file downloaded successfully');
        } catch (error) {
            console.error('Error downloading Excel:', error);
            toast.error('Failed to download Excel file');
        }
    };

    const getMonthName = (monthNumber) => {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months[monthNumber - 1];
    };

    if (loading) {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center text-resdes-teal py-10">
                        Loading analytics...
                    </div>
                </div>
            </div>
        );
    }

    if (!analyticsData) {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center text-red-500 py-10">
                        Failed to load analytics data
                    </div>
                </div>
            </div>
        );
    }

    // Prepare chart data
    const monthlyData = {
        labels: analyticsData.documentsPerMonth.map(item => 
            `${getMonthName(item._id.month)} ${item._id.year}`
        ),
        datasets: [{
            label: 'Documents Created',
            data: analyticsData.documentsPerMonth.map(item => item.count),
            backgroundColor: 'rgba(20, 184, 166, 0.8)',
            borderColor: 'rgba(20, 184, 166, 1)',
            borderWidth: 1
        }]
    };

    const categoryData = {
        labels: analyticsData.documentsByCategory.map(item => item._id),
        datasets: [{
            label: 'Documents by Category',
            data: analyticsData.documentsByCategory.map(item => item.count),
            backgroundColor: [
                'rgba(255, 99, 132, 0.8)',
                'rgba(54, 162, 235, 0.8)',
                'rgba(255, 205, 86, 0.8)',
                'rgba(75, 192, 192, 0.8)',
                'rgba(153, 102, 255, 0.8)',
                'rgba(255, 159, 64, 0.8)',
                'rgba(199, 199, 199, 0.8)',
                'rgba(83, 102, 255, 0.8)'
            ]
        }]
    };

    const authorData = {
        labels: analyticsData.documentsByAuthor.map(item => item._id.name),
        datasets: [{
            label: 'Documents by Author',
            data: analyticsData.documentsByAuthor.map(item => item.count),
            backgroundColor: 'rgba(251, 146, 60, 0.8)',
            borderColor: 'rgba(251, 146, 60, 1)',
            borderWidth: 1
        }]
    };

    const reviewStatusData = {
        labels: analyticsData.reviewStatus.map(item => item._id),
        datasets: [{
            label: 'Review Status',
            data: analyticsData.reviewStatus.map(item => item.count),
            backgroundColor: [
                'rgba(239, 68, 68, 0.8)',  // Red for Overdue
                'rgba(245, 158, 11, 0.8)', // Yellow for Due Soon
                'rgba(34, 197, 94, 0.8)'   // Green for Current
            ]
        }]
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Document Analytics'
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    stepSize: 1
                }
            }
        }
    };

    const pieOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'right',
            }
        }
    };

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-4">
                <div className="max-w-screen-xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <BarChart3Icon className="size-8 text-resdes-orange" />
                            <h1 className="text-4xl font-bold text-base-content">Document Analytics</h1>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-base-100 rounded-xl shadow-md p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Total Documents</p>
                                    <p className="text-2xl font-bold text-base-content">{analyticsData.totals.documents}</p>
                                </div>
                                <div className="p-3 bg-blue-100 rounded-full">
                                    <BarChart3Icon className="size-6 text-blue-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-base-100 rounded-xl shadow-md p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                                    <p className="text-2xl font-bold text-base-content">{analyticsData.totals.users}</p>
                                </div>
                                <div className="p-3 bg-green-100 rounded-full">
                                    <TrendingUpIcon className="size-6 text-green-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-base-100 rounded-xl shadow-md p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Categories</p>
                                    <p className="text-2xl font-bold text-base-content">{analyticsData.totals.categories}</p>
                                </div>
                                <div className="p-3 bg-purple-100 rounded-full">
                                    <PieChartIcon className="size-6 text-purple-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-base-100 rounded-xl shadow-md p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Recent (30 days)</p>
                                    <p className="text-2xl font-bold text-base-content">{analyticsData.totals.recentDocuments}</p>
                                </div>
                                <div className="p-3 bg-orange-100 rounded-full">
                                    <TrendingUpIcon className="size-6 text-orange-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Monthly Documents Chart */}
                        <div className="bg-base-100 rounded-xl shadow-md p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-base-content">Documents Created by Month (2025)</h2>
                                <button
                                    onClick={() => downloadExcel('monthly', analyticsData.documentsPerMonth, 'documents-by-month')}
                                    className="btn btn-sm bg-resdes-green text-slate-900 hover:bg-resdes-green hover:opacity-80"
                                >
                                    <DownloadIcon size={16} />
                                    Excel
                                </button>
                            </div>
                            <div className="h-80">
                                <Bar data={monthlyData} options={chartOptions} />
                            </div>
                        </div>

                        {/* Documents by Category */}
                        <div className="bg-base-100 rounded-xl shadow-md p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-base-content">Documents by Category</h2>
                                <button
                                    onClick={() => downloadExcel('category', analyticsData.documentsByCategory, 'documents-by-category')}
                                    className="btn btn-sm bg-resdes-green text-slate-900 hover:bg-resdes-green hover:opacity-80"
                                >
                                    <DownloadIcon size={16} />
                                    Excel
                                </button>
                            </div>
                            <div className="h-80">
                                <Pie data={categoryData} options={pieOptions} />
                            </div>
                        </div>

                        {/* Top Authors */}
                        <div className="bg-base-100 rounded-xl shadow-md p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-base-content">Top Document Authors</h2>
                                <button
                                    onClick={() => downloadExcel('author', analyticsData.documentsByAuthor, 'documents-by-author')}
                                    className="btn btn-sm bg-resdes-green text-slate-900 hover:bg-resdes-green hover:opacity-80"
                                >
                                    <DownloadIcon size={16} />
                                    Excel
                                </button>
                            </div>
                            <div className="h-80">
                                <Bar data={authorData} options={chartOptions} />
                            </div>
                        </div>

                        {/* Review Status */}
                        <div className="bg-base-100 rounded-xl shadow-md p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-base-content">Document Review Status</h2>
                                <button
                                    onClick={() => downloadExcel('review', analyticsData.reviewStatus, 'review-status')}
                                    className="btn btn-sm bg-resdes-green text-slate-900 hover:bg-resdes-green hover:opacity-80"
                                >
                                    <DownloadIcon size={16} />
                                    Excel
                                </button>
                            </div>
                            <div className="h-80">
                                <Pie data={reviewStatusData} options={pieOptions} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsPage;
