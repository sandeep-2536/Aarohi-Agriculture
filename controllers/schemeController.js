// controllers/schemeController.js

exports.getSchemes = (req, res) => {
    const lang = req.query.lang || req.lang || 'en';

    const schemes = {
        en: [
            {
                name: "PM-KISAN",
                icon: "/images/money-icon.png",
                desc: "₹6,000 yearly support",
                state: "All India",
                type: "Income Support",
                fullDesc: "Pradhan Mantri Kisan Samman Nidhi - Direct income support to all landholding farmers.",
                eligibility: ["Active farmers with valid land records", "Aadhaar linked bank account", "Income below specified threshold"]
            },
            {
                name: "Soil Health Card",
                icon: "/images/soil-icon.png",
                desc: "Free soil testing",
                state: "All India",
                type: "Fertilizer Guidance",
                fullDesc: "Get free soil testing and fertility management recommendations for optimal crop yield.",
                eligibility: ["All farmers with cultivable land", "No age limit", "One card per farmer"]
            },
            {
                name: "PM Fasal Bima Yojana",
                icon: "/images/crop-icon.png",
                desc: "Crop insurance, low premium",
                state: "All India",
                type: "Insurance",
                fullDesc: "Comprehensive crop insurance scheme covering yield losses due to natural calamities.",
                eligibility: ["Tenant farmers included", "Minimal paperwork required", "Coverage for all major crops"]
            },
            {
                name: "Karnataka Raitha Siri",
                icon: "/images/seed-icon.png",
                desc: "Millet farmers financial aid",
                state: "Karnataka",
                type: "Support",
                fullDesc: "Financial assistance for small and marginal millet farmers in Karnataka.",
                eligibility: ["Millet farming in Karnataka", "Land ownership or lease", "Annual registration required"]
            }
        ],
        hi: [
            {
                name: "पीएम-किसान",
                icon: "/images/money-icon.png",
                desc: "₹6,000 वार्षिक सहायता",
                state: "अखिल भारतीय",
                type: "आय सहायता",
                fullDesc: "प्रधानमंत्री किसान सम्मान निधि - सभी भूमि धारण करने वाले किसानों को प्रत्यक्ष आय सहायता।",
                eligibility: ["वैध भूमि रिकॉर्ड वाले सक्रिय किसान", "आधार से जुड़ा बैंक खाता", "निर्धारित सीमा से कम आय"]
            },
            {
                name: "मृदा स्वास्थ्य कार्ड",
                icon: "/images/soil-icon.png",
                desc: "मुफ्त मिट्टी परीक्षण",
                state: "अखिल भारतीय",
                type: "खाद मार्गदर्शन",
                fullDesc: "मुफ्त मिट्टी परीक्षण और इष्टतम फसल उपज के लिए उर्वरता प्रबंधन सुझाव।",
                eligibility: ["कृषि योग्य भूमि वाले सभी किसान", "कोई आयु सीमा नहीं", "प्रति किसान एक कार्ड"]
            },
            {
                name: "पीएम फसल बीमा योजना",
                icon: "/images/crop-icon.png",
                desc: "फसल बीमा, कम प्रीमियम",
                state: "अखिल भारतीय",
                type: "बीमा",
                fullDesc: "प्राकृतिक आपदाओं के कारण उपज हानि को कवर करने वाली व्यापक फसल बीमा योजना।",
                eligibility: ["किरायेदार किसान शामिल", "न्यूनतम कागजी कार्रवाई", "सभी प्रमुख फसलें कवर"]
            },
            {
                name: "कर्नाटक रैथा सिरी",
                icon: "/images/seed-icon.png",
                desc: "बाजरा किसानों वित्तीय सहायता",
                state: "कर्नाटक",
                type: "समर्थन",
                fullDesc: "कर्नाटक में छोटे और सीमांत बाजरा किसानों को वित्तीय सहायता।",
                eligibility: ["कर्नाटक में बाजरा खेती", "भूमि स्वामित्व या पट्टा", "वार्षिक पंजीकरण आवश्यक"]
            }
        ],
        kn: [
            {
                name: "ಪಿಎಂ-ಕಿಸಾನ್",
                icon: "/images/money-icon.png",
                desc: "₹6,000 ವಾರ್ಷಿಕ ಸಹಾಯತೆ",
                state: "ಅಖಿಲ ಭಾರತ",
                type: "ಆದಾಯ ಬೆಂಬಲ",
                fullDesc: "ಪ್ರಧಾನ ಮಂತ್ರಿ ಕಿಸಾನ್ ಸಮ್ಮಾನ ನಿಧಿ - ಎಲ್ಲಾ ಭೂ ಹೊಂದುವ ರೈತರಿಗೆ ನೇರ ಆದಾಯ ಸಹಾಯತೆ.",
                eligibility: ["ಮಾನ್ಯ ಭೂ ದಾಖಲೆಗಳನ್ನು ಹೊಂದಿರುವ ಸಕ್ರಿಯ ರೈತರು", "ಆಧಾರ್ ಲಿಂಕ್ ಮಾಡಲಾದ ಬ್ಯಾಂಕ್ ಖಾತೆ", "ನಿಗದಿತ ಮಿತಿಗಿಂತ ಕಡಿಮೆ ಆದಾಯ"]
            },
            {
                name: "ಮಣ್ಣಿನ ಆರೋಗ್ಯ ಕಾರ್ಡ್",
                icon: "/images/soil-icon.png",
                desc: "ಉಚಿತ ಮಣ್ಣಿನ ಪರೀಕ್ಷೆ",
                state: "ಅಖಿಲ ಭಾರತ",
                type: "ರಸಗೊಬ್ಬರ ಮಾರ್ಗದರ್ಶನ",
                fullDesc: "ಸಾಮರ್ಥ್ಯಶೀಲ ಬೆಳೆ ಇಳುವರಿಯ ಮಾನ್ಯತೆ ಪರೀಕ್ಷೆ ಮತ್ತು ಸಾರಗೊಬ್ಬರ ನಿರ್ವಹಣೆ ಶಿಫಾರಿಸುಗಳು.",
                eligibility: ["ಕೃಷಿಯೋಗ್ಯ ಭೂಮಿ ಹೊಂದುವ ಎಲ್ಲಾ ರೈತರು", "ವಯಸ್ಸಿನ ಸೀಮೆಯಿಲ್ಲ", "ಪ್ರತಿ ರೈತೆ ಒಂದು ಕಾರ್ಡ್"]
            },
            {
                name: "ಪಿಎಂ ಫಸಲ್ ಬೀಮಾ ಯೋಜನೆ",
                icon: "/images/crop-icon.png",
                desc: "ಬೆಳೆ ವಿಮೆ, ಕಡಿಮೆ ಪ್ರಿಮಿಯಮ್",
                state: "ಅಖಿಲ ಭಾರತ",
                type: "ವಿಮೆ",
                fullDesc: "ನೈಸರ್ಗಿಕ ವಿಪತ್ತುಗಳ ಕಾರಣ ಇಳುವರಿ ನಷ್ಟವನ್ನು ಒಳಗೊಂಡಿರುವ ಸಮಗ್ರ ಬೆಳೆ ವಿಮೆ ಯೋಜನೆ.",
                eligibility: ["ಪಾಡುವೆ ರೈತರು ಸೇರ್ಪಡೆಯಾಗಿದೆ", "ನ್ಯೂನತಮ ಕಾಗದದ ಕೆಲಸ", "ಎಲ್ಲಾ ಪ್ರಮುಖ ಬೆಳೆಗಳನ್ನು ಒಳಗೊಂಡಿದೆ"]
            },
            {
                name: "ಕರ್ನಾಟಕ ರೈಥ ಸಿರಿ",
                icon: "/images/seed-icon.png",
                desc: "ಸೋಳುಗಾರ ರೈತರ ಆರ್ಥಿಕ ಸಹಾಯತೆ",
                state: "ಕರ್ನಾಟಕ",
                type: "ಬೆಂಬಲ",
                fullDesc: "ಕರ್ನಾಟಕದಲ್ಲಿ ಸಣ್ಣ ಮತ್ತು ಅವನತ ಸೋಳುಗಾರ ರೈತರಿಗೆ ಆರ್ಥಿಕ ಸಹಾಯತೆ.",
                eligibility: ["ಕರ್ನಾಟಕದಲ್ಲಿ ಸೋಳುಗಾರಿಕೆ", "ಭೂಮಿ ಒಡೆತನ ಅಥವಾ ಪಟ್ಟಾ", "ವಾರ್ಷಿಕ ನೋಂದಣಿ ಅಗತ್ಯ"]
            }
        ]
    };

    const selectedSchemes = schemes[lang] || schemes['en'];

    res.render("schemes/index", { schemes: selectedSchemes, lang });
};
