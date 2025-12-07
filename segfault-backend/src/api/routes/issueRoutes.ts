import express from "express";
import multer from "multer";
import path from "path";
import { getIssues, getIssueTypes, getIssue, createIssue, voteOnIssue, getIssuesInBounds } from "../controllers/issueController";
import { authMiddleware, optionalAuth } from "../middleware/auth";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, "uploads/");
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (_req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed"));
        }
    },
});

router.get("/", optionalAuth, getIssues);
router.get("/types", getIssueTypes);
router.get("/map", optionalAuth, getIssuesInBounds);
router.get("/:id", optionalAuth, getIssue);
router.post("/report", authMiddleware, upload.single("file"), createIssue);
router.post("/:id/vote", authMiddleware, voteOnIssue);

export default router;

