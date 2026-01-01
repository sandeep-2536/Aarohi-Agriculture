const User = require("../models/User");

// Step 1: Show login page
exports.showLogin = (req, res) => {
    res.render("auth/login");
};

// Step 2: Generate OTP (dummy)
exports.sendOtp = async (req, res) => {
    const { mobileNumber } = req.body;

    // Store number in session temporarily
    req.session.mobileNumber = mobileNumber;

    return res.render("auth/otp", { mobileNumber });
};

// Step 3: Verify OTP
exports.verifyOtp = async (req, res) => {
    const { otp } = req.body;

    if (otp !== "1234") {
        return res.send("Invalid OTP");
    }

    const mobile = req.session.mobileNumber;

    let user = await User.findOne({ mobileNumber: mobile });

    if (!user) {
        // Go to profile creation page
        return res.render("auth/profile", { mobileNumber: mobile });
    }

    // Existing user → login
    req.session.user = user;
    return res.redirect("/dashboard");
};

// Step 4: Create new farmer profile
exports.createProfile = async (req, res) => {
    const { name, mobileNumber } = req.body;

    const user = await User.create({ name, mobileNumber });

    req.session.user = user;

    return res.redirect("/dashboard");
};
