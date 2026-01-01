// testGemini.js - Run this to test your Gemini integration
// Usage: node testGemini.js

require('dotenv').config();
const mongoose = require('mongoose');
const geminiController = require('./controllers/geminiController');

async function testGeminiIntegration() {
    console.log('🧪 Testing Gemini API Integration...\n');
    
    // Check environment variables
    console.log('1️⃣ Checking environment variables...');
    const requiredVars = ['MONGODB_URI', 'GEMINI_API_KEY1'];
    let missingVars = [];
    
    requiredVars.forEach(varName => {
        if (!process.env[varName]) {
            missingVars.push(varName);
            console.log(`   ❌ ${varName} is NOT set`);
        } else {
            console.log(`   ✅ ${varName} is set`);
        }
    });
    
    if (missingVars.length > 0) {
        console.error('\n❌ Missing environment variables. Please add them to your .env file');
        process.exit(1);
    }
    
    // Connect to database
    console.log('\n2️⃣ Connecting to MongoDB...');
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('   ✅ Connected to MongoDB');
    } catch (error) {
        console.error('   ❌ MongoDB connection failed:', error.message);
        process.exit(1);
    }
    
    // Test Gemini API
    console.log('\n3️⃣ Testing Gemini API...');
    try {
        const result = await geminiController.fetchNewSchemes();
        
        console.log('\n📊 RESULTS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Success:', result.success);
        console.log('Message:', result.message);
        console.log('New Schemes Found:', result.count);
        
        if (result.schemes && result.schemes.length > 0) {
            console.log('\n📝 New Schemes:');
            result.schemes.forEach((scheme, i) => {
                console.log(`\n${i + 1}. ${scheme.name}`);
                console.log(`   State: ${scheme.state}`);
                console.log(`   Type: ${scheme.type}`);
                console.log(`   Confidence: ${scheme.confidence}`);
                console.log(`   Description: ${scheme.desc}`);
            });
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        if (result.success) {
            console.log('\n✅ TEST PASSED! Gemini integration is working');
            console.log('💡 You can now:');
            console.log('   1. Visit /admin/pending-schemes to review new schemes');
            console.log('   2. Approve schemes to notify farmers via SMS');
            console.log('   3. The system will auto-check every 12 hours');
        } else {
            console.log('\n⚠️ TEST COMPLETED WITH WARNINGS');
            console.log('Check the error message above for details');
        }
        
    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        console.error('Stack trace:', error.stack);
    }
    
    // Cleanup
    console.log('\n4️⃣ Cleaning up...');
    await mongoose.disconnect();
    console.log('   ✅ Disconnected from MongoDB');
    
    console.log('\n🎉 Test complete!\n');
    process.exit(0);
}

// Run the test
testGeminiIntegration().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});