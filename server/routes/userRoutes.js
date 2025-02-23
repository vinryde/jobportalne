import express from "express";
import {
    applyForJob,
    getUserJobApplications,
    updateUserResume,
    syncUserData,
} from "../controllers/userController.js";
import upload from "../config/multer.js";

const router = express.Router();

// 🔹 Sync User Data from Clerk (Ensures user exists in MongoDB)
router.post("/sync", syncUserData);

// 🔹 Apply for a job
router.post("/apply", applyForJob);

// 🔹 Get applied jobs data
router.post("/applications", getUserJobApplications);

// 🔹 Update user profile (resume)
router.post("/update-resume", upload.single("resume"), updateUserResume);

export default router;
