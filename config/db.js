const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        // 1. Fixed the slash before the database name
        // 2. Removed deprecated options
        await mongoose.connect("mongodb+srv://arunh8623:root00@mycluster.p6okdew.mongodb.net/AarohiAgriculture?retryWrites=true&w=majority&appName=MyCluster");
        
        console.log("✅ MongoDB Connected Successfully");
    } catch (error) {
        console.log("❌ MongoDB Connection Failed (continuing without DB)");
        console.error(error); // Print the actual error object
        // Do NOT exit here so the app can run in environments without MongoDB (dev fallback)
    }
};

module.exports = connectDB;