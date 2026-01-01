const cron = require('node-cron');
const geminiController = require('../controllers/geminiController');

function initializeCronJobs() {
    console.log('⚙️ Initializing cron jobs...');

    // Run every 12 hours (at 00:00 and 12:00 daily)
    // Cron pattern: '0 */12 * * *' means "at minute 0 of every 12th hour"
    const job = cron.schedule('0 */12 * * *', async () => {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⏰ SCHEDULED TASK TRIGGERED');
        console.log('📅 Time:', new Date().toLocaleString());
        console.log('🔍 Checking for new government schemes...');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        try {
            const result = await geminiController.fetchNewSchemes();
            
            if (result.success) {
                console.log('✅ Scheduled check completed successfully');
                console.log(`📊 Result: ${result.message}`);
                if (result.count > 0) {
                    console.log(`🎉 ${result.count} new scheme(s) added for admin review`);
                }
            } else {
                console.error('❌ Scheduled check failed:', result.message);
            }
        } catch (error) {
            console.error('❌ Scheduled task error:', error);
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });

    // Log next scheduled run times
    const nextRun = getNextCronRuns(2);
    console.log('✅ Cron job initialized successfully');
    console.log('⏰ Schedule: Every 12 hours (00:00 and 12:00)');
    console.log('📅 Next runs:');
    nextRun.forEach((time, i) => {
        console.log(`   ${i + 1}. ${time}`);
    });
    console.log('');

    return job;
}

// Helper function to calculate next cron run times
function getNextCronRuns(count = 2) {
    const now = new Date();
    const runs = [];
    
    for (let i = 0; i < count; i++) {
        const nextRun = new Date(now);
        
        // Calculate next 12-hour interval
        const currentHour = nextRun.getHours();
        if (currentHour < 12) {
            nextRun.setHours(12, 0, 0, 0);
        } else {
            nextRun.setDate(nextRun.getDate() + 1);
            nextRun.setHours(0, 0, 0, 0);
        }
        
        // Add additional 12-hour intervals for subsequent runs
        nextRun.setHours(nextRun.getHours() + (i * 12));
        
        runs.push(nextRun.toLocaleString());
    }
    
    return runs;
}

module.exports = { initializeCronJobs };