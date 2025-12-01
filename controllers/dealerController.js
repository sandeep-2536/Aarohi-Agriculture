// controllers/dealerController.js
const Stock = require('../models/Stock');

exports.dashboard = async (req, res) => {
  try {
    const dealer = req.session.dealer;
    const stocks = await Stock.find({ dealer: dealer._id }).sort({ createdAt: -1 });
    res.render('dealer/dashboard', { dealer, stocks });
  } catch (err) {
    console.error('dealer dashboard error', err);
    res.status(500).send('Server error');
  }
};
