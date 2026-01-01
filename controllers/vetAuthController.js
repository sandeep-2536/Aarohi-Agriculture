// controllers/vetAuthController.js
const Vet = require("../models/Vet");

exports.showRegister = (req, res) => {
  res.render("vetAuth/register");
};

exports.register = async (req, res) => {
  try {
    const { name, phone, specialization, password } = req.body;

    if (!/^(\+91)?[6-9]\d{9}$/.test(phone)) {
      return res.send("Invalid Indian phone number");
    }

    const existing = await Vet.findOne({ phone });
    if (existing) {
      return res.send("A vet with this phone already exists.");
    }

    const vet = await Vet.create({
      name,
      phone,
      specialization,
      password // TODO: hash later
    });

    res.redirect("/vet-auth/login");
  } catch (err) {
    console.error("Vet register error:", err);
    res.status(500).send("Error registering vet");
  }
};

exports.showLogin = (req, res) => {
  res.render("vetAuth/login");
};

exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;
    const vet = await Vet.findOne({ phone, password }); // PLAIN check

    if (!vet) {
      return res.send("Invalid phone or password");
    }

    req.session.vet = {
      _id: vet._id,
      name: vet.name,
      phone: vet.phone,
      specialization: vet.specialization
    };

    res.redirect("/teleVet");
  } catch (err) {
    console.error("Vet login error:", err);
    res.status(500).send("Error logging in vet");
  }
};

exports.logout = (req, res) => {
  delete req.session.vet;
  res.redirect("/vet-auth/login");
};
