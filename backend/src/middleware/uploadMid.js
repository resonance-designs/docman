/*
 * @author Richard Bakos
 * @version 1.1.10
 * @license UNLICENSED
 */
import multer from "multer";
import fs from "fs";
import path from "path";

// Ensure uploads folder exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    },
});

const uploadMid = multer({ storage });
export default uploadMid;

