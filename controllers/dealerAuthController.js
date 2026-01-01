// controllers/dealerAuthController.js
const Dealer = require('../models/Dealer');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

exports.showRegister = (req, res) => {
  res.render('dealerAuth/register');
};

exports.register = async (req, res) => {
  try {
    const { name, shopName, phone, password, village, taluk, district } = req.body;
    if (!/^(\+91)?[6-9]\d{9}$/.test(phone)) return res.send('Invalid Indian phone');

    const existing = await Dealer.findOne({ phone });
    if (existing) return res.send('Dealer with this phone already exists');

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const dealer = await Dealer.create({
      name,
      shopName,
      phone,
      passwordHash,
      location: { village, taluk, district }
    });

    res.redirect('/dealer-auth/login');
  } catch (err) {
    console.error('dealer register error', err);
    res.status(500).send('Error registering dealer');
  }
};

exports.showLogin = (req, res) => {
  res.render('dealerAuth/login');
};

exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;
    const dealer = await Dealer.findOne({ phone });
    if (!dealer) return res.send('Invalid phone or password');

    const ok = await bcrypt.compare(password, dealer.passwordHash);
    if (!ok) return res.send('Invalid phone or password');

    req.session.dealer = {
      _id: dealer._id,
      name: dealer.name,
      phone: dealer.phone,
      shopName: dealer.shopName,
      location: dealer.location
    };

    res.redirect('/stock');
  } catch (err) {
    console.error('dealer login error', err);
    res.status(500).send('Login error');
  }
};

exports.logout = (req, res) => {
  delete req.session.dealer;
  res.redirect('/dealer-auth/login');
};
