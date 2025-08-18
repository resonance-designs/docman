/*
 * @author Richard Bakos
 * @version 2.1.6
 * @license UNLICENSED
 */
import CustomChart from "../models/CustomChart.js";
import Doc from "../models/Doc.js";
import User from "../models/User.js";
import Category from "../models/Category.js";
import Team from "../models/Team.js";
import Project from "../models/Project.js";

/**
 * Get all custom charts
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of charts or error message
 */
export async function getAllCustomCharts(req, res) {
    try {
        const charts = await CustomChart.find({ isPublic: true })
            .populate('createdBy', 'firstname lastname email')
            .sort({ createdAt: -1 });
        
        // Also include charts created by the current user
        const userCharts = await CustomChart.find({ createdBy: req.user._id.toString() })
            .populate('createdBy', 'firstname lastname email')
            .sort({ createdAt: -1 });
        
        // Combine public charts with user's own charts, avoiding duplicates
        const allCharts = [...userCharts, ...charts.filter(chart => 
            !userCharts.some(userChart => userChart._id.equals(chart._id))
        )];
        
        res.status(200).json(allCharts);
    } catch (error) {
        console.error("Error fetching custom charts:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Get a specific custom chart by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with chart data or error message
 */
export async function getCustomChartById(req, res) {
    try {
        const chart = await CustomChart.findById(req.params.id)
            .populate('createdBy', 'firstname lastname email');
        
        if (!chart) {
            return res.status(404).json({ message: "Custom chart not found" });
        }
        
        // Check if user has permission to view this chart
        if (!chart.isPublic && chart.createdBy._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Access denied to this chart" });
        }
        
        res.status(200).json(chart);
    } catch (error) {
        console.error("Error fetching custom chart:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Create a new custom chart
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with created chart data or error message
 */
export async function createCustomChart(req, res) {
    try {
        const { name, description, chartType, dataSource, xAxisField, yAxisField, groupByField, filters, colorPalette, isPublic } = req.body;
        
        const newChart = new CustomChart({
            name,
            description,
            chartType,
            dataSource,
            xAxisField,
            yAxisField,
            groupByField,
            filters,
            colorPalette,
            isPublic,
            createdBy: req.user._id.toString()
        });
        
        await newChart.save();
        
        // Populate the creator info
        const populatedChart = await CustomChart.findById(newChart._id)
            .populate('createdBy', 'firstname lastname email');
        
        res.status(201).json({
            message: "Custom chart created successfully",
            chart: populatedChart
        });
    } catch (error) {
        console.error("Error creating custom chart:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Update a custom chart
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with updated chart data or error message
 */
export async function updateCustomChart(req, res) {
    try {
        const chart = await CustomChart.findById(req.params.id);
        
        if (!chart) {
            return res.status(404).json({ message: "Custom chart not found" });
        }
        
        // Check if user is the creator
        if (chart.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Access denied: You can only update your own charts" });
        }
        
        const { name, description, chartType, dataSource, xAxisField, yAxisField, groupByField, filters, colorPalette, isPublic } = req.body;
        
        chart.name = name || chart.name;
        chart.description = description || chart.description;
        chart.chartType = chartType || chart.chartType;
        chart.dataSource = dataSource || chart.dataSource;
        chart.xAxisField = xAxisField || chart.xAxisField;
        chart.yAxisField = yAxisField || chart.yAxisField;
        chart.groupByField = groupByField || chart.groupByField;
        chart.filters = filters || chart.filters;
        chart.colorPalette = colorPalette || chart.colorPalette;
        chart.isPublic = isPublic !== undefined ? isPublic : chart.isPublic;
        
        await chart.save();
        
        // Populate the creator info
        const populatedChart = await CustomChart.findById(chart._id)
            .populate('createdBy', 'firstname lastname email');
        
        res.status(200).json({
            message: "Custom chart updated successfully",
            chart: populatedChart
        });
    } catch (error) {
        console.error("Error updating custom chart:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Delete a custom chart
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function deleteCustomChart(req, res) {
    try {
        const chart = await CustomChart.findById(req.params.id);
        
        if (!chart) {
            return res.status(404).json({ message: "Custom chart not found" });
        }
        
        // Check if user is the creator
        if (chart.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Access denied: You can only delete your own charts" });
        }
        
        await CustomChart.findByIdAndDelete(req.params.id);
        
        res.status(200).json({ message: "Custom chart deleted successfully" });
    } catch (error) {
        console.error("Error deleting custom chart:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Get chart data based on configuration
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with chart data or error message
 */
export async function getChartData(req, res) {
    try {
        const chartId = req.params.id;
        const chart = await CustomChart.findById(chartId);
        
        if (!chart) {
            return res.status(404).json({ message: "Custom chart not found" });
        }
        
        // Check if user has permission to view this chart
        if (!chart.isPublic && chart.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Access denied to this chart" });
        }
        
        let data;
        let labels;
        
        // Get data based on the dataSource
        switch (chart.dataSource) {
            case "documents":
                data = await getDocumentData(chart);
                break;
            case "users":
                data = await getUserData(chart);
                break;
            case "categories":
                data = await getCategoryData(chart);
                break;
            case "teams":
                data = await getTeamData(chart);
                break;
            case "projects":
                data = await getProjectData(chart);
                break;
            default:
                return res.status(400).json({ message: "Invalid data source" });
        }
        
        res.status(200).json({
            chartId: chart._id,
            chartName: chart.name,
            chartType: chart.chartType,
            data: data,
            labels: labels
        });
    } catch (error) {
        console.error("Error fetching chart data:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Get document data for chart
 * @param {Object} chart - Chart configuration object
 * @returns {Array} Array of document statistics
 */
async function getDocumentData(chart) {
    const matchConditions = {};
    
    // Apply filters if any
    if (chart.filters && Object.keys(chart.filters).length > 0) {
        for (const [key, value] of Object.entries(chart.filters)) {
            matchConditions[key] = value;
        }
    }
    
    console.log('📊 Chart config:', {
        groupByField: chart.groupByField,
        dataSource: chart.dataSource,
        matchConditions
    });
    
    let aggregationPipeline = [
        { $match: matchConditions }
    ];
    
    // Group by field if specified
    if (chart.groupByField) {
        // Special handling for author field to get user names
        if (chart.groupByField === 'author' || chart.groupByField === 'createdBy' || chart.groupByField === 'lastUpdatedBy' || chart.groupByField === 'reviewCompletedBy') {
            aggregationPipeline.push(
                {
                    $lookup: {
                        from: 'users',
                        localField: chart.groupByField,
                        foreignField: '_id',
                        as: 'authorInfo'
                    }
                },
                {
                    $unwind: {
                        path: '$authorInfo',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $group: {
                        _id: {
                            $cond: {
                                if: { $ne: ['$authorInfo', null] },
                                then: { $concat: ['$authorInfo.firstname', ' ', '$authorInfo.lastname'] },
                                else: 'Unknown'
                            }
                        },
                        count: { $sum: 1 }
                    }
                }
            );
        } else {
            aggregationPipeline.push({
                $group: {
                    _id: `$${chart.groupByField}`,
                    count: { $sum: 1 }
                }
            });
        }
        
        // Sort by count descending
        aggregationPipeline.push({ $sort: { count: -1 } });
    }
    
    console.log('📊 Aggregation pipeline:', JSON.stringify(aggregationPipeline, null, 2));
    const result = await Doc.aggregate(aggregationPipeline);
    console.log('📊 Aggregation result:', result);
    
    return result;
}

/**
 * Get user data for chart
 * @param {Object} chart - Chart configuration object
 * @returns {Array} Array of user statistics
 */
async function getUserData(chart) {
    const matchConditions = {};
    
    // Apply filters if any
    if (chart.filters && Object.keys(chart.filters).length > 0) {
        for (const [key, value] of Object.entries(chart.filters)) {
            matchConditions[key] = value;
        }
    }
    
    let aggregationPipeline = [
        { $match: matchConditions }
    ];
    
    // Group by field if specified
    if (chart.groupByField) {
        aggregationPipeline.push({
            $group: {
                _id: `$${chart.groupByField}`,
                count: { $sum: 1 }
            }
        });
        
        // Sort by count descending
        aggregationPipeline.push({ $sort: { count: -1 } });
    }
    
    return await User.aggregate(aggregationPipeline);
}

/**
 * Get category data for chart
 * @param {Object} chart - Chart configuration object
 * @returns {Array} Array of category statistics
 */
async function getCategoryData(chart) {
    const matchConditions = {};
    
    // Apply filters if any
    if (chart.filters && Object.keys(chart.filters).length > 0) {
        for (const [key, value] of Object.entries(chart.filters)) {
            matchConditions[key] = value;
        }
    }
    
    let aggregationPipeline = [
        { $match: matchConditions }
    ];
    
    // Group by field if specified
    if (chart.groupByField) {
        aggregationPipeline.push({
            $group: {
                _id: `$${chart.groupByField}`,
                count: { $sum: 1 }
            }
        });
        
        // Sort by count descending
        aggregationPipeline.push({ $sort: { count: -1 } });
    }
    
    return await Category.aggregate(aggregationPipeline);
}

/**
 * Get team data for chart
 * @param {Object} chart - Chart configuration object
 * @returns {Array} Array of team statistics
 */
async function getTeamData(chart) {
    const matchConditions = {};
    
    // Apply filters if any
    if (chart.filters && Object.keys(chart.filters).length > 0) {
        for (const [key, value] of Object.entries(chart.filters)) {
            matchConditions[key] = value;
        }
    }
    
    let aggregationPipeline = [
        { $match: matchConditions }
    ];
    
    // Group by field if specified
    if (chart.groupByField) {
        aggregationPipeline.push({
            $group: {
                _id: `$${chart.groupByField}`,
                count: { $sum: 1 }
            }
        });
        
        // Sort by count descending
        aggregationPipeline.push({ $sort: { count: -1 } });
    }
    
    return await Team.aggregate(aggregationPipeline);
}

/**
 * Get project data for chart
 * @param {Object} chart - Chart configuration object
 * @returns {Array} Array of project statistics
 */
async function getProjectData(chart) {
    const matchConditions = {};
    
    // Apply filters if any
    if (chart.filters && Object.keys(chart.filters).length > 0) {
        for (const [key, value] of Object.entries(chart.filters)) {
            matchConditions[key] = value;
        }
    }
    
    let aggregationPipeline = [
        { $match: matchConditions }
    ];
    
    // Group by field if specified
    if (chart.groupByField) {
        aggregationPipeline.push({
            $group: {
                _id: `$${chart.groupByField}`,
                count: { $sum: 1 }
            }
        });
        
        // Sort by count descending
        aggregationPipeline.push({ $sort: { count: -1 } });
    }
    
    return await Project.aggregate(aggregationPipeline);
}