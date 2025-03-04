import Job from "../models/Job.js";
import JobApplication from "../models/JobApplication.js";
import User from "../models/User.js";
import { v2 as cloudinary } from "cloudinary";

// 🔹 Helper Function: Ensure User Exists in MongoDB
const ensureUserExists = async (clerkId, email, firstName, lastName, image) => {
    if (!clerkId || clerkId === "null" || clerkId === "" || !email) {
        throw new Error(`❌ Invalid user data received: clerkId=${clerkId}, email=${email}`);
    }

    // 🔍 Check if user already exists
    let user = await User.findOne({ clerkId });

    if (user) {
        console.log(`✔️ User already exists in MongoDB: clerkId=${clerkId}`);
        return user; // ✅ Return existing user instead of inserting a duplicate
    }

    console.log(`🆕 Creating new user in MongoDB: clerkId=${clerkId}...`);

    user = new User({
        clerkId,
        email,
        firstName: firstName || "Unknown",
        lastName: lastName || "Unknown",
        image: image || "",
        name: `${firstName || ""} ${lastName || ""}`.trim(),
    });

    try {
        await user.save();
        return user;
    } catch (error) {
        if (error.code === 11000) {
            console.error("❌ Duplicate key error (clerkId already exists):", error);
            return await User.findOne({ clerkId }); // ✅ Instead of failing, return existing user
        }
        console.error("❌ Error saving user to MongoDB:", error);
        throw new Error("Database error: Unable to save user.");
    }
};


// 🔹 Sync User Data (Called from Frontend)
export const syncUserData = async (req, res) => {
    try {
        const { clerkId, email, firstName, lastName, image } = req.body;

        if (!clerkId || clerkId === "null" || clerkId === "" || !email) {
            console.error(`❌ Invalid request: clerkId=${clerkId}, email=${email}`);
            return res.status(400).json({
                success: false,
                message: "Missing or invalid clerkId or email",
            });
        }

        const user = await ensureUserExists(clerkId, email, firstName, lastName, image);
        res.json({ success: true, user });

    } catch (error) {
        console.error("❌ Error syncing user:", error);
        res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

// 🔹 Get User Applied Job Applications
export const getUserJobApplications = async (req, res) => {
    try {
        const { clerkId, email } = req.body;
        console.log(`🔎 Fetching job applications for clerkId=${clerkId}, email=${email}`);

        // Ensure user exists
        const user = await User.findOne({ clerkId });
        if (!user) {
            console.error(`❌ User not found in MongoDB: clerkId=${clerkId}`);
            return res.status(404).json({ success: false, message: "User not found" });
        }

        console.log(`🟢 User found:`, user);

        // Fetch job applications
        const applications = await JobApplication.find({ userId: user._id })
            .populate("companyId", "name email image")
            .populate("jobId", "title description location category level salary");

        console.log(`🔍 Applications found:`, applications);

        if (!applications.length) {
            return res.json({ success: false, message: "No job applications found" });
        }

        res.json({ success: true, applications });

    } catch (error) {
        console.error("❌ Error fetching applications:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};






// 🔹 Apply For Job
export const applyForJob = async (req, res) => {
    try {
        console.log("🔹 Received Request Body:", req.body);

        const { clerkId, email, firstName, lastName, jobId } = req.body;

        if (!clerkId || !jobId) {
            console.error("❌ Missing required fields");
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        // ✅ Ensure User Exists
        const user = await ensureUserExists(clerkId, email, firstName, lastName);
        if (!user) {
            console.error(`❌ User not found: clerkId=${clerkId}`);
            return res.status(400).json({ success: false, message: "User not found" });
        }

        console.log(`✅ User found:`, user);

        // ✅ Check if Job Exists
        const jobData = await Job.findById(jobId);
        if (!jobData) {
            console.error(`❌ Job Not Found: ${jobId}`);
            return res.status(404).json({ success: false, message: "Job Not Found" });
        }

        console.log(`✅ Job found:`, jobData);

        // ✅ Check if User Already Applied
        const isAlreadyApplied = await JobApplication.findOne({ jobId, userId: user._id });
        if (isAlreadyApplied) {
            console.warn(`⚠️ User already applied for job ${jobId}`);
            return res.status(400).json({ success: false, message: "Already Applied" });
        }

        console.log("✅ User has not applied yet. Proceeding with application...");

        // ✅ Save Job Application
        const newApplication = new JobApplication({
            companyId: jobData.companyId,
            userId: user._id,
            jobId,
            date: Date.now(),
        });

        await newApplication.save();
        console.log(`✅ Job Application Saved:`, newApplication);

        res.json({ success: true, message: "Applied Successfully", application: newApplication });

    } catch (error) {
        console.error("❌ Error applying for job:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};





// 🔹 Update User Resume
export const updateUserResume = async (req, res) => {
    try {
        const { clerkId } = req.body;
        const resumeFile = req.file;

        if (!resumeFile) {
            return res.status(400).json({ success: false, message: "No resume file uploaded." });
        }

        const user = await User.findOne({ clerkId });
        if (!user) {
            console.error(`❌ User not found while uploading resume: clerkId=${clerkId}`);
            return res.status(404).json({ success: false, message: "User not found" });
        }

        console.log(`📌 Uploading resume for user:`, user);

        const resumeUpload = await cloudinary.uploader.upload(resumeFile.path);
        user.resume = resumeUpload.secure_url;
        await user.save();

        console.log(`✅ Resume updated successfully:`, user.resume);

        res.json({ success: true, message: "Resume Updated", resumeUrl: user.resume });

    } catch (error) {
        console.error("❌ Error updating resume:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


