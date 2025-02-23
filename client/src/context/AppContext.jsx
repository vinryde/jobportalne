import { createContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth, useUser } from "@clerk/clerk-react";

export const AppContext = createContext();

export const AppContextProvider = (props) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    const { user } = useUser();
    const { getToken } = useAuth();

    const [searchFilter, setSearchFilter] = useState({
        title: "",
        location: "",
    });

    const [isSearched, setIsSearched] = useState(false);
    const [jobs, setJobs] = useState([]);
    const [showRecruiterLogin, setShowRecruiterLogin] = useState(false);
    const [companyToken, setCompanyToken] = useState(null);
    const [companyData, setCompanyData] = useState(null);
    const [userData, setUserData] = useState(null);
    const [userApplications, setUserApplications] = useState([]);

    // 🔹 Function to Fetch Jobs
    const fetchJobs = async () => {
        try {
            const { data } = await axios.get(backendUrl + "/api/jobs");

            if (data.success) {
                setJobs(data.jobs);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    // 🔹 Function to Fetch Company Data
    const fetchCompanyData = async () => {
        try {
            const { data } = await axios.get(backendUrl + "/api/company/company", {
                headers: { token: companyToken },
            });

            if (data.success) {
                setCompanyData(data.company);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    // 🔹 Function to Fetch & Sync User Data
    const fetchUserData = async () => {
        if (!user || !user.id || !user.primaryEmailAddress) {
            console.warn("⏭ Skipping fetchUserData: User data is incomplete", user);
            return;
        }

        try {
            const token = await getToken();

            const { data } = await axios.post(
                backendUrl + "/api/users/sync",
                {
                    clerkId: user.id || "INVALID", // ✅ Prevents null values
                    email: user.primaryEmailAddress.emailAddress || "",
                    firstName: user.firstName || "Unknown",
                    lastName: user.lastName || "Unknown",
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (data.success) {
                setUserData(data.user);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error("❌ Error fetching user data:", error.response?.data || error.message);
            toast.error(error.response?.data?.message || "Error syncing user data");
        }
    };

    // 🔹 Function to Fetch User's Applied Applications
    const fetchUserApplications = async () => {
        const clerkIdToUse = userData?.clerkId || user?.id;
    
        if (!clerkIdToUse) {
            console.warn("⏭ Skipping fetchUserApplications: Missing clerkId.");
            return;
        }
    
        try {
            const token = await getToken();
            console.log("📩 Sending request to backend for applications:", { clerkId: clerkIdToUse });
    
            const response = await axios.post(
                `${backendUrl}/api/users/applications`,
                { clerkId: clerkIdToUse },
                { headers: { Authorization: `Bearer ${token}` } }
            );
    
            console.log("✅ API Response:", response.data);
    
            if (response.data.success) {
                console.log("✅ Applications fetched successfully:", response.data.applications);
                setUserApplications(response.data.applications);
            } else {
                console.warn("📭 No job applications found.");
                setUserApplications([]); // ✅ Clear old applications
            }
        } catch (error) {
            console.error("❌ Error fetching applications:", error.response?.data || error.message);
            setUserApplications([]); // ✅ Reset applications on failure
        }
    };
    
    
    
    

    // 🔹 Retrieve Company Token From LocalStorage
    useEffect(() => {
        fetchJobs();

        const storedCompanyToken = localStorage.getItem("companyToken");

        if (storedCompanyToken) {
            setCompanyToken(storedCompanyToken);
        }
    }, []);

    // 🔹 Fetch Company Data if Company Token is Available
    useEffect(() => {
        if (companyToken) {
            fetchCompanyData();
        }
    }, [companyToken]);

    // 🔹 Fetch User Data when User Logs In
    useEffect(() => {
        if (user) {
            fetchUserData();
        }
    }, [user]);

    // 🔹 Fetch User Applications Only When User Data is Available
    useEffect(() => {
        if (userData && userData.clerkId) {
            fetchUserApplications();
        }
    }, [userData]);

    const value = {
        setSearchFilter,
        searchFilter,
        isSearched,
        setIsSearched,
        jobs,
        setJobs,
        showRecruiterLogin,
        setShowRecruiterLogin,
        companyToken,
        setCompanyToken,
        companyData,
        setCompanyData,
        backendUrl,
        userData,
        setUserData,
        userApplications,
        setUserApplications,
        fetchUserData,
        fetchUserApplications,
    };

    return <AppContext.Provider value={value}>{props.children}</AppContext.Provider>;
};
