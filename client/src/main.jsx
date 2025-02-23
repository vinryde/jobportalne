import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { AppContextProvider } from "./context/AppContext.jsx";
import { ClerkProvider, useUser } from "@clerk/clerk-react";
import axios from "axios";
import { useEffect, useState } from "react";

// Import your publishable key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key");
}

// 🔹 Auto-Sync Clerk User to MongoDB After Login
const SyncUser = () => {
  const { user, isLoaded } = useUser();
  const [synced, setSynced] = useState(false); // Prevent duplicate syncs

  useEffect(() => {
    if (!isLoaded) {
      console.warn("🕓 Waiting for Clerk user data to load...");
      return;
    }

    if (!user || !user.id || !user.primaryEmailAddress) {
      console.error("🚨 Clerk user data is incomplete:", user);
      return;
    }

    console.log("🆔 Clerk User ID:", user.id);
    console.log("📧 Clerk Email:", user.primaryEmailAddress?.emailAddress);

    const userData = {
      clerkId: user.id, // ✅ Ensures `clerkId` is always a valid string
      email: user.primaryEmailAddress?.emailAddress || "no-email@placeholder.com",
      firstName: user.firstName?.trim() || "",
      lastName: user.lastName?.trim() || "",
      image: user.imageUrl?.trim() || "",
      name: `${user.firstName?.trim() || ""} ${user.lastName?.trim() || ""}`.trim(),
    };

    const syncUserToDB = async () => {
      try {
        console.log("🚀 Sending user data to backend:", userData);
        const response = await axios.post("http://localhost:5000/api/users/sync", userData);
        console.log("✅ Server response:", response.data);
        if (response.data.success) {
          setSynced(true);
        }
      } catch (error) {
        console.error("❌ Error syncing user:", error.response?.data || error.message);
      }
    };

    if (!synced) syncUserToDB();
  }, [user, isLoaded, synced]);

  return null;
};

createRoot(document.getElementById("root")).render(
  <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
    <BrowserRouter>
      <AppContextProvider>
        <SyncUser /> {/* 🔹 Auto-sync user on login */}
        <App />
      </AppContextProvider>
    </BrowserRouter>
  </ClerkProvider>
);
