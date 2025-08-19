/*
 * @author Richard Bakos
 * @version 2.1.10
 * @license UNLICENSED
 */
import mongoose from "mongoose";

const customChartSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ""
    },
    chartType: {
        type: String,
        required: true,
        enum: ["bar", "line", "pie", "doughnut", "radar", "polarArea"]
    },
    dataSource: {
        type: String,
        required: true,
        enum: ["documents", "users", "categories", "teams", "projects"]
    },
    xAxisField: {
        type: String,
        default: ""
    },
    yAxisField: {
        type: String,
        default: ""
    },
    groupByField: {
        type: String,
        default: ""
    },
    filters: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
    },
    colorPalette: {
        type: [String],
        default: []
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    isPublic: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

const CustomChart = mongoose.model("CustomChart", customChartSchema);

export default CustomChart;