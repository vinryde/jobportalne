import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    clerkId: { type: String, required: true, unique: true }, // ✅ Make sure this matches the API input
    email: { type: String, required: true, unique: true },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    image: { type: String, default: "" },
    name: { type: String, default: "" },
}, { timestamps: true });

export default mongoose.model("User", UserSchema);
