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
        const { clerkId } = req.body;
        
        // ✅ Ensure user exists
        const user = await User.findOne({ clerkId });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        console.log(`🔎 Fetching applications for user ID: ${user._id}`);

        // ✅ Fetch applications using user._id (not clerkId)
        const applications = await JobApplication.find({ userId: user._id })
            .populate("companyId", "name email image")
            .populate("jobId", "title description location category level salary")
            .exec();

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
        const { clerkId, email, firstName, lastName, jobId } = req.body;
        
        const user = await ensureUserExists(clerkId, email, firstName, lastName);

        const isAlreadyApplied = await JobApplication.findOne({ jobId, userId: user._id });
        if (isAlreadyApplied) {
            console.warn(`⚠️ User already applied for job ${jobId}`);
            return res.status(400).json({ success: false, message: "Already Applied" });
        }

        const jobData = await Job.findById(jobId);
        if (!jobData) {
            console.error(`❌ Job Not Found: ${jobId}`);
            return res.status(404).json({ success: false, message: "Job Not Found" });
        }

        const newApplication = await JobApplication.create({
            companyId: jobData.companyId,
            userId: user._id,
            jobId,
            date: Date.now(),
        });

        console.log(`✅ Job Application Saved:`, newApplication);

        res.json({ success: true, message: "Applied Successfully" });

    } catch (error) {
        console.error("❌ Error applying for job:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};



// 🔹 Update User Resume
export const updateUserResume = async (req, res) => {
    try {
        const { clerkId, email, firstName, lastName } = req.body;
        const resumeFile = req.file;

        if (!resumeFile) {
            return res.status(400).json({ success: false, message: "No resume file uploaded." });
        }

        // We assume that the user exists; if not, ensureUserExists will throw
        const user = await ensureUserExists(clerkId, email, firstName, lastName);
        const resumeUpload = await cloudinary.uploader.upload(resumeFile.path);
        user.resume = resumeUpload.secure_url;
        await user.save();
        // Return updated user object
        const updatedUser = await User.findOne({ clerkId });
        res.json({ success: true, message: "Resume Updated", user: updatedUser });
    } catch (error) {
        console.error("❌ Error updating resume:", error);
        res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

