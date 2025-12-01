// controllers/schemeController.js

exports.getSchemes = (req, res) => {
    const schemes = [
        {
            name: "PM-KISAN",
            icon: "/images/money-icon.png",
            desc: "₹6,000 yearly support",
            state: "All India",
            type: "Income Support"
        },
        {
            name: "Soil Health Card",
            icon: "/images/soil-icon.png",
            desc: "Free soil testing",
            state: "All India",
            type: "Fertilizer Guidance"
        },
        {
            name: "PM Fasal Bima Yojana",
            icon: "/images/crop-icon.png",
            desc: "Crop insurance, low premium",
            state: "All India",
            type: "Insurance"
        },
        {
            name: "Karnataka Raitha Siri",
            icon: "/images/seed-icon.png",
            desc: "Millet farmers financial aid",
            state: "Karnataka",
            type: "Support"
        }
    ];

    res.render("schemes/index", { schemes });
};
