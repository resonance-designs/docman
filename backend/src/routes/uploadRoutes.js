import express from "express";
import uploadMid from "../middleware/uploadMid.js";

const router = express.Router();

router.post("/", (req, res) => {
    uploadMid.single("file")(req, res, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
            filename: req.file.filename,
            url: `/uploads/${req.file.filename}`,
        });
    });
});

export default router;
