const twilio = require('twilio');
const Scheme = require('../models/Scheme');
const Farmer = require('../models/Farmer');

// ✅ Twilio configuration - NO hardcoded values
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE;

// Check if Twilio credentials are configured
if (!accountSid || !authToken || !twilioPhone) {
    console.warn('⚠️  Twilio credentials not configured. SMS notifications will be disabled.');
}

const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null;

// ✅ Admin credentials - NO hardcoded values
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Check if admin credentials are configured
if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    console.error('❌ Admin credentials not set in .env file!');
    process.exit(1);
}

// ========================
// AUTHENTICATION
// ========================

// Middleware to check authentication
exports.checkAuth = (req, res, next) => {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    res.redirect('/admin/login');
};

// Admin login page
exports.getLogin = (req, res) => {
    // If already logged in, redirect to dashboard
    if (req.session && req.session.isAdmin) {
        return res.redirect('/admin/dashboard');
    }
    res.render('admin/login', { error: null });
};

// Handle admin login
exports.postLogin = (req, res) => {
    const { username, password } = req.body;
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        req.session.adminUsername = username;
        
        // Save session explicitly
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.render('admin/login', { 
                    error: 'Session error. Please try again.' 
                });
            }
            res.redirect('/admin/dashboard');
        });
    } else {
        res.render('admin/login', { 
            error: 'Invalid username or password' 
        });
    }
};

// Admin logout
exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/admin/login');
    });
};

// ========================
// DASHBOARD
// ========================

// Admin dashboard
exports.getDashboard = async (req, res) => {
    try {
        const totalSchemes = await Scheme.countDocuments();
        const totalFarmers = await Farmer.countDocuments();
        
        res.render('admin/dashboard', {
            totalSchemes,
            totalFarmers
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('admin/dashboard', {
            totalSchemes: 0,
            totalFarmers: 0
        });
    }
};

// ========================
// SCHEME MANAGEMENT
// ========================

// Get all schemes for admin
exports.getSchemes = async (req, res) => {
    try {
        const schemes = await Scheme.find().sort({ createdAt: -1 });
        res.render('admin/schemes', { schemes });
    } catch (error) {
        console.error('Error fetching schemes:', error);
        res.render('admin/schemes', { 
            schemes: [],
            error: 'Failed to load schemes'
        });
    }
};

// Get add scheme page
exports.getAddScheme = (req, res) => {
    res.render('admin/add-scheme', { 
        error: null, 
        success: null 
    });
};

// Handle adding new scheme
exports.postAddScheme = async (req, res) => {
    try {
        const { name, desc, state, type, icon } = req.body;
        
        // Validate required fields
        if (!name || !desc || !state || !type) {
            return res.render('admin/add-scheme', { 
                error: 'All fields are required', 
                success: null 
            });
        }

        // Create new scheme
        const newScheme = new Scheme({
            name: name.trim(),
            desc: desc.trim(),
            state: state.trim(),
            type: type.trim(),
            icon: icon ? icon.trim() : '/images/default-scheme-icon.png'
        });
        
        await newScheme.save();
        
        // Send SMS notifications to all farmers
        await sendSchemeNotification(name, state);
        
        res.render('admin/add-scheme', { 
            error: null, 
            success: 'Scheme added successfully and farmers notified via SMS!' 
        });
    } catch (error) {
        console.error('Error adding scheme:', error);
        res.render('admin/add-scheme', { 
            error: 'Failed to add scheme: ' + error.message, 
            success: null 
        });
    }
};

// Get edit scheme page
exports.getEditScheme = async (req, res) => {
    try {
        const scheme = await Scheme.findById(req.params.id);
        
        if (!scheme) {
            return res.redirect('/admin/schemes');
        }
        
        res.render('admin/edit-scheme', { 
            scheme, 
            error: null, 
            success: null 
        });
    } catch (error) {
        console.error('Error fetching scheme:', error);
        res.redirect('/admin/schemes');
    }
};

// Handle editing scheme
exports.postEditScheme = async (req, res) => {
    try {
        const { name, desc, state, type, icon, notifyFarmers } = req.body;
        
        // Validate required fields
        if (!name || !desc || !state || !type) {
            const scheme = await Scheme.findById(req.params.id);
            return res.render('admin/edit-scheme', { 
                scheme,
                error: 'All fields are required', 
                success: null 
            });
        }

        const updatedData = {
            name: name.trim(),
            desc: desc.trim(),
            state: state.trim(),
            type: type.trim(),
            icon: icon ? icon.trim() : '/images/default-scheme-icon.png',
            updatedAt: Date.now()
        };

        await Scheme.findByIdAndUpdate(req.params.id, updatedData);
        
        // Send SMS if checkbox was checked
        if (notifyFarmers === 'on') {
            await sendSchemeUpdateNotification(name, state);
        }
        
        res.redirect('/admin/schemes');
    } catch (error) {
        console.error('Error updating scheme:', error);
        const scheme = await Scheme.findById(req.params.id);
        res.render('admin/edit-scheme', { 
            scheme,
            error: 'Failed to update scheme: ' + error.message, 
            success: null 
        });
    }
};

// Delete scheme
exports.deleteScheme = async (req, res) => {
    try {
        await Scheme.findByIdAndDelete(req.params.id);
        res.redirect('/admin/schemes');
    } catch (error) {
        console.error('Error deleting scheme:', error);
        res.redirect('/admin/schemes');
    }
};

// ========================
// SMS NOTIFICATION FUNCTIONS
// ========================

// Send SMS for new scheme
async function sendSchemeNotification(schemeName, state) {
    // Check if Twilio is configured
    if (!twilioClient) {
        console.warn('⚠️  Twilio not configured. Skipping SMS notification.');
        return;
    }

    try {
        // Get farmers (optionally filter by state)
        let query = { smsEnabled: true };
        
        // If scheme is state-specific, only notify farmers from that state
        if (state && state !== 'All India') {
            query.state = state;
        }
        
        const farmers = await Farmer.find(query);
        
        if (farmers.length === 0) {
            console.log('No farmers to notify');
            return;
        }

        const message = `🌾 New Government Scheme Alert!\n\n"${schemeName}" is now available for ${state} farmers.\n\nVisit Aarohi Agriculture app to learn more and apply!`;
        
        // Send SMS to each farmer (in batches to avoid rate limits)
        const batchSize = 10;
        for (let i = 0; i < farmers.length; i += batchSize) {
            const batch = farmers.slice(i, i + batchSize);
            
            const promises = batch.map(farmer => {
                if (farmer.phone) {
                    return twilioClient.messages.create({
                        body: message,
                        from: twilioPhone,
                        to: farmer.phone
                    }).catch(err => {
                        console.error(`Failed to send SMS to ${farmer.phone}:`, err.message);
                        return null;
                    });
                }
            });
            
            await Promise.all(promises);
            
            // Small delay between batches
            if (i + batchSize < farmers.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log(`✅ SMS notifications sent to ${farmers.length} farmers`);
    } catch (error) {
        console.error('Error sending SMS notifications:', error);
    }
}

// Send SMS for scheme update
async function sendSchemeUpdateNotification(schemeName, state) {
    // Check if Twilio is configured
    if (!twilioClient) {
        console.warn('⚠️  Twilio not configured. Skipping SMS notification.');
        return;
    }

    try {
        let query = { smsEnabled: true };
        
        if (state && state !== 'All India') {
            query.state = state;
        }
        
        const farmers = await Farmer.find(query);
        
        if (farmers.length === 0) {
            console.log('No farmers to notify');
            return;
        }

        const message = `📢 Scheme Update!\n\n"${schemeName}" has been updated. Check the Aarohi Agriculture app for latest details.\n\n- Aarohi Team`;
        
        const batchSize = 10;
        for (let i = 0; i < farmers.length; i += batchSize) {
            const batch = farmers.slice(i, i + batchSize);
            
            const promises = batch.map(farmer => {
                if (farmer.phone) {
                    return twilioClient.messages.create({
                        body: message,
                        from: twilioPhone,
                        to: farmer.phone
                    }).catch(err => {
                        console.error(`Failed to send SMS to ${farmer.phone}:`, err.message);
                        return null;
                    });
                }
            });
            
            await Promise.all(promises);
            
            if (i + batchSize < farmers.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log(`✅ Update notifications sent to ${farmers.length} farmers`);
    } catch (error) {
        console.error('Error sending update notifications:', error);
    }
}
