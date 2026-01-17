const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect("mongodb+srv://arunh8623:root00@mycluster.p6okdew.mongodb.net/AarohiAgriculture?retryWrites=true&w=majority&appName=MyCluster", {
            maxPoolSize: 10,
            minPoolSize: 2,
            socketTimeoutMS: 45000,
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000,
            retryWrites: true,
            maxIdleTimeMS: 45000
        });
        
        console.log("✅ MongoDB Connected Successfully");
        
        // Monitor connection events
        mongoose.connection.on('disconnected', () => {
            console.log("⚠️ MongoDB Disconnected");
        });
        
        mongoose.connection.on('error', (err) => {
            console.error("❌ MongoDB Connection Error:", err.message);
        });
        
    } catch (error) {
        console.log("❌ MongoDB Connection Failed");
        console.error("Error:", error.message);
    }
};

module.exports = connectDB;