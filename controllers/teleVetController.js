// controllers/teleVetController.js
const Vet = require("../models/Vet");
const User = require("../models/User"); // you already have this

exports.listVets = async (req, res) => {
  try {
    const vets = await Vet.find().sort({ createdAt: -1 });
    res.render("teleVet/vetList", { vets });
  } catch (err) {
    console.error("listVets error:", err);
    res.status(500).send("Server error");
  }
};

// farmer video call page
exports.farmerCallPage = async (req, res) => {
  try {
    const vetId = req.params.vetId;
    const vet = await Vet.findById(vetId);
    if (!vet) return res.status(404).send("Vet not found");

    // user is already in res.locals.user from your app.js middleware
    const farmer = req.session.user;
    if (!farmer) return res.redirect("/auth/login");

    // roomId will be generated in frontend JS
    res.render("teleVet/farmerCall", {
      vet,
      farmer
    });
  } catch (err) {
    console.error("farmerCallPage error:", err);
    res.status(500).send("Server error");
  }
};

// vet dashboard for incoming calls
exports.vetDashboard = async (req, res) => {
  const vet = req.session.vet;
  res.render("teleVet/vetDashboard", { vet });
};

// vet video call page
exports.doctorCallPage = async (req, res) => {
  try {
    const vet = req.session.vet;
    if (!vet) return res.redirect("/vet-auth/login");

    const { roomId, farmerId } = req.query;
    const farmer = await User.findById(farmerId);

    res.render("teleVet/doctorCall", {
      vet,
      roomId,
      farmer
    });
  } catch (err) {
    console.error("doctorCallPage error:", err);
    res.status(500).send("Server error");
  }
};
