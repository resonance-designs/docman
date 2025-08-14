/*
 * @author Richard Bakos
 * @version 2.0.0
 * @license UNLICENSED
 */
import { useState, useEffect } from "react";
import { Bar, Line, Pie, Doughnut, Radar, PolarArea } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    LineElement,
    PointElement,
    ArcElement,
    RadialLinearScale
} from 'chart.js';
import { 
    PlusIcon, 
    EditIcon, 
    TrashIcon, 
    SaveIcon, 
    XIcon,
    BarChart3Icon,
    PieChartIcon,
    EyeIcon
} from "lucide-react";
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
    LineElement,
    PointElement,
    ArcElement,
    RadialLinearScale
);

const CustomChartsPage = () => {
    const [charts, setCharts] = useState([]);
    const [selectedChart, setSelectedChart] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        chartType: "bar",
        dataSource: "documents",
        xAxisField: "",
        yAxisField: "",
        groupByField: "",
        filters: {},
        colorPalette: [],
        isPublic: false
    });

    // Available chart types
    const chartTypes = [
        { value: "bar", label: "Bar Chart", icon: BarChart3Icon },
        { value: "line", label: "Line Chart", icon: BarChart3Icon },
        { value: "pie", label: "Pie Chart", icon: PieChartIcon },
        { value: "doughnut", label: "Doughnut Chart", icon: PieChartIcon },
        { value: "radar", label: "Radar Chart", icon: PieChartIcon },
        { value: "polarArea", label: "Polar Area Chart", icon: PieChartIcon }
    ];

    // Available data sources
    const dataSources = [
        { value: "documents", label: "Documents" },
        { value: "users", label: "Users" },
        { value: "categories", label: "Categories" },
        { value: "teams", label: "Teams" },
        { value: "projects", label: "Projects" }
    ];

    // Default color palettes
    const colorPalettes = [
        ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"],
        ["#ef4444", "#f87171", "#fca5a5", "#fecaca", "#fee2e2"],
        ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5"],
        ["#f59e0b", "#fbbf24", "#fcd34d", "#fde68a", "#fef3c7"],
        ["#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe"]
    ];

    useEffect(() => {
        fetchCustomCharts();
    }, []);

    const fetchCustomCharts = async () => {
        try {
            const response = await api.get("/custom-charts");
            setCharts(response.data);
        } catch (error) {
            console.error("Error fetching custom charts:", error);
            toast.error("Failed to load custom charts");
        } finally {
            setLoading(false);
        }
    };

    const fetchChartData = async (chartId) => {
        try {
            const response = await api.get(`/custom-charts/${chartId}/data`);
            setChartData(response.data);
        } catch (error) {
            console.error("Error fetching chart data:", error);
            toast.error("Failed to load chart data");
        }
    };

    const handleCreateNew = () => {
        setIsCreating(true);
        setIsEditing(false);
        setSelectedChart(null);
        setFormData({
            name: "",
            description: "",
            chartType: "bar",
            dataSource: "documents",
            xAxisField: "",
            yAxisField: "",
            groupByField: "",
            filters: {},
            colorPalette: [],
            isPublic: false
        });
    };

    const handleEdit = (chart) => {
        setIsCreating(false);
        setIsEditing(true);
        setSelectedChart(chart);
        setFormData({
            name: chart.name,
            description: chart.description,
            chartType: chart.chartType,
            dataSource: chart.dataSource,
            xAxisField: chart.xAxisField,
            yAxisField: chart.yAxisField,
            groupByField: chart.groupByField,
            filters: chart.filters || {},
            colorPalette: chart.colorPalette || [],
            isPublic: chart.isPublic
        });
    };

    const handleView = async (chart) => {
        setSelectedChart(chart);
        setIsCreating(false);
        setIsEditing(false);
        await fetchChartData(chart._id);
    };

    const handleDelete = async (chartId) => {
        if (!window.confirm("Are you sure you want to delete this chart?")) return;

        try {
            await api.delete(`/custom-charts/${chartId}`);
            toast.success("Chart deleted successfully");
            fetchCustomCharts();
            if (selectedChart && selectedChart._id === chartId) {
                setSelectedChart(null);
                setChartData(null);
            }
        } catch (error) {
            console.error("Error deleting chart:", error);
            toast.error("Failed to delete chart");
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();

        try {
            if (isEditing && selectedChart) {
                // Update existing chart
                const response = await api.put(`/custom-charts/${selectedChart._id}`, formData);
                toast.success("Chart updated successfully");
                setSelectedChart(response.data.chart);
            } else {
                // Create new chart
                const response = await api.post("/custom-charts", formData);
                toast.success("Chart created successfully");
                setSelectedChart(response.data.chart);
            }

            fetchCustomCharts();
            setIsCreating(false);
            setIsEditing(false);
        } catch (error) {
            console.error("Error saving chart:", error);
            toast.error("Failed to save chart");
        }
    };

    const handleCancel = () => {
        setIsCreating(false);
        setIsEditing(false);
        setSelectedChart(null);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));
    };

    const handleColorPaletteSelect = (palette) => {
        setFormData(prev => ({
            ...prev,
            colorPalette: palette
        }));
    };

    const renderChart = () => {
        if (!chartData) return null;

        const chartOptions = {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: chartData.chartName
                }
            }
        };

        // Prepare data for chart
        const labels = chartData.data.map(item => item._id || 'Unknown');
        const dataValues = chartData.data.map(item => item.count || item.value || 0);

        const chartDataObj = {
            labels: labels,
            datasets: [{
                label: 'Count',
                data: dataValues,
                backgroundColor: formData.colorPalette.length > 0 
                    ? formData.colorPalette 
                    : colorPalettes[0],
                borderColor: formData.colorPalette.length > 0 
                    ? formData.colorPalette.map(color => color + '80') 
                    : colorPalettes[0].map(color => color + '80'),
                borderWidth: 1
            }]
        };

        switch (formData.chartType) {
            case 'bar':
                return <Bar data={chartDataObj} options={chartOptions} />;
            case 'line':
                return <Line data={chartDataObj} options={chartOptions} />;
            case 'pie':
                return <Pie data={chartDataObj} options={chartOptions} />;
            case 'doughnut':
                return <Doughnut data={chartDataObj} options={chartOptions} />;
            case 'radar':
                return <Radar data={chartDataObj} options={chartOptions} />;
            case 'polarArea':
                return <PolarArea data={chartDataObj} options={chartOptions} />;
            default:
                return <Bar data={chartDataObj} options={chartOptions} />;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center text-resdes-teal py-10">
                        Loading custom charts...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-4">
                <div className="max-w-screen-xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <BarChart3Icon className="size-8 text-resdes-orange" />
                            <h1 className="text-4xl font-bold text-base-content">Custom Charts</h1>
                        </div>
                        <button
                            onClick={handleCreateNew}
                            className="btn bg-resdes-orange text-slate-950 hover:bg-resdes-orange hover:opacity-80"
                        >
                            <PlusIcon size={16} />
                            Create New Chart
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Chart List */}
                        <div className="lg:col-span-1">
                            <div className="bg-base-100 rounded-xl shadow-md p-6">
                                <h2 className="text-xl font-bold text-base-content mb-4">Your Charts</h2>
                                {charts.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-base-content">No custom charts found.</p>
                                        <button
                                            onClick={handleCreateNew}
                                            className="btn btn-sm mt-4 bg-resdes-orange text-slate-950 hover:bg-resdes-orange hover:opacity-80"
                                        >
                                            Create Your First Chart
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                        {charts.map((chart) => (
                                            <div 
                                                key={chart._id} 
                                                className={`p-4 rounded-lg border ${
                                                    selectedChart && selectedChart._id === chart._id 
                                                        ? 'border-resdes-orange bg-resdes-orange/10' 
                                                        : 'border-base-300'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-bold text-base-content">{chart.name}</h3>
                                                        <p className="text-sm text-base-content/70 mt-1">{chart.description}</p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className="badge badge-sm badge-primary">
                                                                {chart.chartType}
                                                            </span>
                                                            {chart.isPublic && (
                                                                <span className="badge badge-sm badge-success">
                                                                    Public
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => handleView(chart)}
                                                            className="btn btn-xs btn-ghost"
                                                            title="View"
                                                        >
                                                            <EyeIcon size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleEdit(chart)}
                                                            className="btn btn-xs btn-ghost"
                                                            title="Edit"
                                                        >
                                                            <EditIcon size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(chart._id)}
                                                            className="btn btn-xs btn-ghost text-red-500"
                                                            title="Delete"
                                                        >
                                                            <TrashIcon size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Chart Editor/Viewer */}
                        <div className="lg:col-span-2">
                            {(isCreating || isEditing) ? (
                                // Chart Editor Form
                                <div className="bg-base-100 rounded-xl shadow-md p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-xl font-bold text-base-content">
                                            {isEditing ? "Edit Chart" : "Create New Chart"}
                                        </h2>
                                        <button
                                            onClick={handleCancel}
                                            className="btn btn-sm btn-ghost"
                                        >
                                            <XIcon size={16} />
                                        </button>
                                    </div>

                                    <form onSubmit={handleSave}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="label">
                                                    <span className="label-text">Chart Name *</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleInputChange}
                                                    className="input input-bordered w-full"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label className="label">
                                                    <span className="label-text">Chart Type</span>
                                                </label>
                                                <select
                                                    name="chartType"
                                                    value={formData.chartType}
                                                    onChange={handleInputChange}
                                                    className="select select-bordered w-full"
                                                >
                                                    {chartTypes.map(type => (
                                                        <option key={type.value} value={type.value}>
                                                            {type.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="label">
                                                    <span className="label-text">Data Source</span>
                                                </label>
                                                <select
                                                    name="dataSource"
                                                    value={formData.dataSource}
                                                    onChange={handleInputChange}
                                                    className="select select-bordered w-full"
                                                >
                                                    {dataSources.map(source => (
                                                        <option key={source.value} value={source.value}>
                                                            {source.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="label">
                                                    <span className="label-text">Group By Field</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    name="groupByField"
                                                    value={formData.groupByField}
                                                    onChange={handleInputChange}
                                                    className="input input-bordered w-full"
                                                    placeholder="e.g., category, status"
                                                />
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="label">
                                                    <span className="label-text">Description</span>
                                                </label>
                                                <textarea
                                                    name="description"
                                                    value={formData.description}
                                                    onChange={handleInputChange}
                                                    className="textarea textarea-bordered w-full"
                                                    rows="3"
                                                />
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="label">
                                                    <span className="label-text">Color Palette</span>
                                                </label>
                                                <div className="flex flex-wrap gap-2">
                                                    {colorPalettes.map((palette, index) => (
                                                        <button
                                                            key={index}
                                                            type="button"
                                                            onClick={() => handleColorPaletteSelect(palette)}
                                                            className={`flex gap-1 p-1 rounded ${
                                                                formData.colorPalette === palette 
                                                                    ? 'ring-2 ring-resdes-orange' 
                                                                    : ''
                                                            }`}
                                                        >
                                                            {palette.map((color, i) => (
                                                                <div 
                                                                    key={i} 
                                                                    className="w-4 h-4 rounded" 
                                                                    style={{ backgroundColor: color }}
                                                                />
                                                            ))}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="label cursor-pointer justify-start gap-2">
                                                    <input
                                                        type="checkbox"
                                                        name="isPublic"
                                                        checked={formData.isPublic}
                                                        onChange={handleInputChange}
                                                        className="checkbox"
                                                    />
                                                    <span className="label-text">Make this chart public</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-3 mt-6">
                                            <button
                                                type="button"
                                                onClick={handleCancel}
                                                className="btn btn-ghost"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="btn bg-resdes-orange text-slate-950 hover:bg-resdes-orange hover:opacity-80"
                                            >
                                                <SaveIcon size={16} />
                                                Save Chart
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            ) : selectedChart && chartData ? (
                                // Chart Viewer
                                <div className="bg-base-100 rounded-xl shadow-md p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <h2 className="text-xl font-bold text-base-content">{chartData.chartName}</h2>
                                            <p className="text-base-content/70">{selectedChart.description}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEdit(selectedChart)}
                                                className="btn btn-sm btn-ghost"
                                            >
                                                <EditIcon size={16} />
                                                Edit
                                            </button>
                                            <button
                                                onClick={handleCancel}
                                                className="btn btn-sm btn-ghost"
                                            >
                                                <XIcon size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="h-96">
                                        {renderChart()}
                                    </div>

                                    <div className="mt-6">
                                        <h3 className="font-bold text-base-content mb-2">Chart Data</h3>
                                        <div className="overflow-x-auto">
                                            <table className="table table-zebra">
                                                <thead>
                                                    <tr>
                                                        <th>Label</th>
                                                        <th>Value</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {chartData.data.map((item, index) => (
                                                        <tr key={index}>
                                                            <td>{item._id || 'Unknown'}</td>
                                                            <td>{item.count || item.value || 0}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // Empty State
                                <div className="bg-base-100 rounded-xl shadow-md p-12 text-center">
                                    <BarChart3Icon className="size-16 text-resdes-orange mx-auto mb-4" />
                                    <h2 className="text-2xl font-bold text-base-content mb-2">Custom Charts</h2>
                                    <p className="text-base-content/70 mb-6">
                                        Create custom charts to visualize your data in meaningful ways.
                                    </p>
                                    <button
                                        onClick={handleCreateNew}
                                        className="btn bg-resdes-orange text-slate-950 hover:bg-resdes-orange hover:opacity-80"
                                    >
                                        <PlusIcon size={16} />
                                        Create Your First Chart
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomChartsPage;