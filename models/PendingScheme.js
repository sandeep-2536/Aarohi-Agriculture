const mongoose = require('mongoose');

const pendingSchemeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    desc: {
        type: String,
        required: true,
        maxlength: 500
    },
    state: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: [
            'Income Support',
            'Insurance',
            'Loan',
            'Subsidy',
            'Training',
            'Equipment',
            'Fertilizer Guidance',
            'Market Access',
            'Irrigation',
            'Support'
        ]
    },
    source: {
        type: String,
        default: 'Gemini AI'
    },
    confidence: {
        type: String,
        enum: ['high', 'medium', 'low'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('PendingScheme', pendingSchemeSchema);