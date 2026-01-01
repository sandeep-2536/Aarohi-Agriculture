const mongoose = require('mongoose');

const schemeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    desc: {
        type: String,
        required: true,
        maxlength: 200
    },
    state: {
        type: String,
        required: true,
        trim: true
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
    icon: {
        type: String,
        default: '/images/default-scheme-icon.png'
    }
}, {
    timestamps: true  // ✅ This automatically adds createdAt and updatedAt
});

module.exports = mongoose.model('Scheme', schemeSchema);