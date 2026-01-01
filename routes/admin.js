const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const geminiController = require('../controllers/geminiController');

// Pending schemes routes
router.get('/pending-schemes', adminController.checkAuth, geminiController.getPendingSchemes);
router.get('/pending-schemes/approve/:id', adminController.checkAuth, geminiController.approvePendingScheme);
router.get('/pending-schemes/reject/:id', adminController.checkAuth, geminiController.rejectPendingScheme);
router.get('/manual-fetch', adminController.checkAuth, geminiController.manualFetch);

// Admin authentication
router.get('/login', adminController.getLogin);
router.post('/login', adminController.postLogin);
router.get('/logout', adminController.logout);

// Admin dashboard (protected)
router.get('/dashboard', adminController.checkAuth, adminController.getDashboard);

// Scheme management
router.get('/schemes', adminController.checkAuth, adminController.getSchemes);
router.get('/schemes/add', adminController.checkAuth, adminController.getAddScheme);
router.post('/schemes/add', adminController.checkAuth, adminController.postAddScheme);
router.get('/schemes/edit/:id', adminController.checkAuth, adminController.getEditScheme);
router.post('/schemes/edit/:id', adminController.checkAuth, adminController.postEditScheme);
router.post('/schemes/delete/:id', adminController.checkAuth, adminController.deleteScheme);

// Add this route to your routes/admin.js file
// This creates a monitoring dashboard for the Gemini integration

const PendingScheme = require('../models/PendingScheme');
const Scheme = require('../models/Scheme');

// Add this route after your existing routes
router.get('/system-monitor', adminController.checkAuth, async (req, res) => {
    try {
        // Get statistics
        const stats = {
            totalApprovedSchemes: await Scheme.countDocuments(),
            pendingSchemes: await PendingScheme.countDocuments({ status: 'pending' }),
            approvedToday: await PendingScheme.countDocuments({
                status: 'approved',
                updatedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
            }),
            rejectedToday: await PendingScheme.countDocuments({
                status: 'rejected',
                updatedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
            }),
            totalPendingEver: await PendingScheme.countDocuments(),
            totalApproved: await PendingScheme.countDocuments({ status: 'approved' }),
            totalRejected: await PendingScheme.countDocuments({ status: 'rejected' })
        };

        // Get recent activity (last 10 pending schemes)
        const recentPending = await PendingScheme.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select('name state type status confidence createdAt');

        // Calculate next cron run
        const now = new Date();
        const currentHour = now.getHours();
        let nextRun = new Date(now);
        
        if (currentHour < 12) {
            nextRun.setHours(12, 0, 0, 0);
        } else {
            nextRun.setDate(nextRun.getDate() + 1);
            nextRun.setHours(0, 0, 0, 0);
        }

        // Calculate time until next run
        const msUntilNext = nextRun - now;
        const hoursUntilNext = Math.floor(msUntilNext / (1000 * 60 * 60));
        const minutesUntilNext = Math.floor((msUntilNext % (1000 * 60 * 60)) / (1000 * 60));

        res.render('admin/system-monitor', {
            stats,
            recentPending,
            nextRun: nextRun.toLocaleString(),
            timeUntilNext: `${hoursUntilNext}h ${minutesUntilNext}m`,
            geminiConfigured: !!process.env.GEMINI_API_KEY1,
            twilioConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
        });
    } catch (error) {
        console.error('System monitor error:', error);
        res.render('admin/system-monitor', {
            stats: {},
            recentPending: [],
            nextRun: 'Error',
            timeUntilNext: 'Error',
            geminiConfigured: false,
            twilioConfigured: false,
            error: error.message
        });
    }
});

module.exports = router;