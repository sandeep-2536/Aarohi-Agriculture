const { GoogleGenerativeAI } = require('@google/generative-ai');
const PendingScheme = require('../models/PendingScheme');
const Scheme = require('../models/Scheme');

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY1);

// ========================
// FETCH NEW SCHEMES FROM GEMINI
// ========================
exports.fetchNewSchemes = async () => {
    try {
        console.log('🔍 Starting Gemini scheme search...');
        console.log('⏰ Current time:', new Date().toLocaleString());

        // Get all existing approved schemes from database
        const existingSchemes = await Scheme.find({}, 'name state');
        const existingNames = existingSchemes.map(s => s.name.toLowerCase().trim());
        
        console.log(`📊 Found ${existingSchemes.length} existing schemes in database`);

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Enhanced prompt for better results
        const prompt = `You are an AI assistant helping Indian farmers find NEW government schemes.

TASK: Search for government agricultural schemes for farmers in India that were announced or updated in the LAST 12 HOURS (from ${new Date(Date.now() - 12*60*60*1000).toLocaleString()} to ${new Date().toLocaleString()}).

EXISTING SCHEMES (DO NOT INCLUDE THESE):
${existingNames.join(', ')}

SEARCH CRITERIA:
1. Must be OFFICIALLY announced by Indian government (Central or State)
2. Must be for farmers/agriculture sector
3. Must be announced or updated in LAST 12 HOURS only
4. Must NOT be in the existing schemes list above

SOURCES TO CHECK:
- Press Information Bureau (PIB)
- Ministry of Agriculture official announcements
- State government agriculture department notifications
- Recent news from PIB, PTI, ANI about farmer schemes

RESPONSE FORMAT (JSON ONLY - NO OTHER TEXT):
If you find NEW schemes, respond with:
[
  {
    "name": "Official Scheme Name",
    "description": "Brief description (under 200 characters)",
    "state": "State name or 'All India'",
    "type": "One of: Income Support, Insurance, Loan, Subsidy, Training, Equipment, Fertilizer Guidance, Market Access, Irrigation, Support",
    "source": "Official URL or source name",
    "confidence": "high/medium/low"
  }
]

If NO new schemes found in last 12 hours, respond with:
[]

CRITICAL RULES:
- Only include schemes with OFFICIAL government sources
- Do NOT fabricate or guess schemes
- Do NOT include schemes from the existing list
- Only schemes announced in LAST 12 HOURS
- Return valid JSON array only (no markdown, no extra text)`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean up response
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        console.log('📝 Gemini Response:', text.substring(0, 500) + '...');

        let schemes;
        try {
            schemes = JSON.parse(text);
        } catch (parseError) {
            console.error('❌ JSON Parse Error:', parseError.message);
            console.error('Raw response:', text);
            return { success: false, message: 'Invalid response format from Gemini AI' };
        }

        if (!Array.isArray(schemes)) {
            console.error('❌ Response is not an array:', schemes);
            return { success: false, message: 'Invalid response structure from Gemini AI' };
        }

        if (schemes.length === 0) {
            console.log('✅ No new schemes found in last 12 hours');
            return { success: true, message: 'No new schemes found in last 12 hours', count: 0 };
        }

        // Filter and save new schemes
        let savedCount = 0;
        const newSchemes = [];

        for (const scheme of schemes) {
            // Validate required fields
            if (!scheme.name || !scheme.description || !scheme.state || !scheme.type) {
                console.warn('⚠️ Skipping incomplete scheme:', scheme);
                continue;
            }

            const schemeName = scheme.name.toLowerCase().trim();

            // Check if already exists in approved or pending
            const existsInApproved = existingNames.includes(schemeName);
            const existsInPending = await PendingScheme.findOne({ 
                name: { $regex: new RegExp(`^${scheme.name}$`, 'i') }
            });

            if (!existsInApproved && !existsInPending) {
                const pendingScheme = await PendingScheme.create({
                    name: scheme.name,
                    desc: scheme.description.substring(0, 200), // Limit to 200 chars
                    state: scheme.state,
                    type: scheme.type,
                    source: scheme.source || 'Gemini AI',
                    confidence: scheme.confidence || 'medium',
                    status: 'pending'
                });
                
                newSchemes.push(pendingScheme);
                savedCount++;
                console.log(`✅ Added new scheme: ${scheme.name}`);
            } else {
                console.log(`⏭️ Skipped duplicate: ${scheme.name}`);
            }
        }

        console.log(`✅ Search complete: Found ${schemes.length} schemes, saved ${savedCount} new ones`);
        
        return { 
            success: true, 
            message: `Found ${savedCount} new scheme${savedCount !== 1 ? 's' : ''} for admin review`, 
            count: savedCount,
            schemes: newSchemes
        };

    } catch (error) {
        console.error('❌ Gemini API Error:', error);
        return { 
            success: false, 
            message: 'Failed to fetch schemes: ' + error.message 
        };
    }
};

// ========================
// GET PENDING SCHEMES
// ========================
exports.getPendingSchemes = async (req, res) => {
    try {
        const pendingSchemes = await PendingScheme.find({ status: 'pending' })
            .sort({ createdAt: -1 });
        
        res.render('admin/pending-schemes', { 
            pendingSchemes,
            success: req.query.success || null,
            error: req.query.error || null
        });
    } catch (error) {
        console.error('Error fetching pending schemes:', error);
        res.render('admin/pending-schemes', { 
            pendingSchemes: [],
            success: null,
            error: 'Failed to load pending schemes: ' + error.message
        });
    }
};

// ========================
// APPROVE PENDING SCHEME
// ========================
exports.approvePendingScheme = async (req, res) => {
    try {
        const pendingScheme = await PendingScheme.findById(req.params.id);
        
        if (!pendingScheme) {
            return res.redirect('/admin/pending-schemes?error=' + encodeURIComponent('Scheme not found'));
        }

        // Create approved scheme
        const newScheme = new Scheme({
            name: pendingScheme.name,
            desc: pendingScheme.desc,
            state: pendingScheme.state,
            type: pendingScheme.type,
            icon: '/images/default-scheme-icon.png'
        });
        
        await newScheme.save();

        // Update pending scheme status
        pendingScheme.status = 'approved';
        await pendingScheme.save();

        console.log(`✅ Scheme approved: ${pendingScheme.name}`);

        // Send SMS notifications to farmers
        await sendSchemeNotification(newScheme.name, newScheme.state);

        res.redirect('/admin/pending-schemes?success=' + encodeURIComponent('Scheme approved and farmers notified via SMS!'));
    } catch (error) {
        console.error('Error approving scheme:', error);
        res.redirect('/admin/pending-schemes?error=' + encodeURIComponent(error.message));
    }
};

// ========================
// REJECT PENDING SCHEME
// ========================
exports.rejectPendingScheme = async (req, res) => {
    try {
        const pendingScheme = await PendingScheme.findById(req.params.id);
        
        if (!pendingScheme) {
            return res.redirect('/admin/pending-schemes?error=' + encodeURIComponent('Scheme not found'));
        }

        pendingScheme.status = 'rejected';
        await pendingScheme.save();

        console.log(`❌ Scheme rejected: ${pendingScheme.name}`);

        res.redirect('/admin/pending-schemes?success=' + encodeURIComponent('Scheme rejected'));
    } catch (error) {
        console.error('Error rejecting scheme:', error);
        res.redirect('/admin/pending-schemes?error=' + encodeURIComponent(error.message));
    }
};

// ========================
// MANUAL TRIGGER (for testing)
// ========================
exports.manualFetch = async (req, res) => {
    try {
        console.log('🔄 Manual fetch triggered by admin');
        const result = await exports.fetchNewSchemes();
        
        if (result.success) {
            res.redirect('/admin/pending-schemes?success=' + encodeURIComponent(result.message));
        } else {
            res.redirect('/admin/pending-schemes?error=' + encodeURIComponent(result.message));
        }
    } catch (error) {
        console.error('Manual fetch error:', error);
        res.redirect('/admin/pending-schemes?error=' + encodeURIComponent(error.message));
    }
};

// ========================
// SMS NOTIFICATION HELPER
// ========================
async function sendSchemeNotification(schemeName, state) {
    const twilio = require('twilio');
    const Farmer = require('../models/Farmer');
    
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE;

    if (!accountSid || !authToken || !twilioPhone) {
        console.warn('⚠️ Twilio not configured, skipping SMS');
        return;
    }

    try {
        const twilioClient = twilio(accountSid, authToken);
        
        let query = { smsEnabled: true };
        if (state && state !== 'All India') {
            query.state = state;
        }
        
        const farmers = await Farmer.find(query);
        
        if (farmers.length === 0) {
            console.log('📭 No farmers to notify');
            return;
        }

        const message = `🌾 New Government Scheme Alert!\n\n"${schemeName}" is now available for ${state} farmers.\n\nVisit Aarohi Agriculture app to learn more and apply!`;
        
        // Send in batches to avoid rate limits
        const batchSize = 10;
        let sentCount = 0;

        for (let i = 0; i < farmers.length; i += batchSize) {
            const batch = farmers.slice(i, i + batchSize);
            
            const promises = batch.map(farmer => {
                if (farmer.phone) {
                    return twilioClient.messages.create({
                        body: message,
                        from: twilioPhone,
                        to: farmer.phone
                    }).then(() => {
                        sentCount++;
                    }).catch(err => {
                        console.error(`Failed to send SMS to ${farmer.phone}:`, err.message);
                    });
                }
            });
            
            await Promise.all(promises);
            
            // Delay between batches
            if (i + batchSize < farmers.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log(`✅ SMS notifications sent to ${sentCount}/${farmers.length} farmers`);
    } catch (error) {
        console.error('❌ SMS notification error:', error);
    }
}