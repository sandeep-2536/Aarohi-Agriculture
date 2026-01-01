// controllers/stockController.js
const Stock = require('../models/Stock');
const Dealer = require('../models/Dealer');
const path = require('path');
const fs = require('fs');

exports.listStocks = async (req, res) => {
  try {
    // filters from querystring
    const { q, category, district } = req.query;
    const filter = {};
    if (q) filter.title = { $regex: q, $options: 'i' };
    if (category) filter.category = category;
    if (district) filter['location.district'] = district;

    const stocks = await Stock.find(filter).sort({ createdAt: -1 }).populate('dealer', 'name shopName phone location');
    res.render('stock/listStocks', { stocks, query: req.query });
  } catch (err) {
    console.error('listStocks error', err);
    res.status(500).send('Server error');
  }
};

exports.showAddForm = (req, res) => {
  res.render('stock/newStock');
};

exports.addStock = async (req, res) => {
  try {
    const dealerSession = req.session.dealer;
    if (!dealerSession) return res.redirect('/dealer-auth/login');

    const {
      title, category, brand='', variety='', quantity, quantityUnit='Kg',
      price, shopName='', village='', taluk='', district=''
    } = req.body;

    const image = req.file ? req.file.filename : '';

    const phone = dealerSession.phone;
    if (!/^(\+91)?[6-9]\d{9}$/.test(phone)) return res.status(400).send('Invalid dealer phone');

    await Stock.create({
      dealer: dealerSession._id,
      title, category, brand, variety,
      quantity: Number(quantity),
      quantityUnit,
      price: Number(price),
      availability: Number(quantity) > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
      image,
      shopName: shopName || dealerSession.shopName || '',
      phone,
      location: { village, taluk, district }
    });

    res.redirect('/stock');
  } catch (err) {
    console.error('addStock error', err);
    res.status(500).send('Error adding stock');
  }
};

exports.stockDetails = async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id).populate('dealer', 'name shopName phone location');
    if (!stock) return res.status(404).send('Not found');
    res.render('stock/stockDetails', { stock, user: req.session.user, dealer: req.session.dealer });
  } catch (err) {
    console.error('stockDetails error', err);
    res.status(500).send('Server error');
  }
};

exports.deleteStock = async (req, res) => {
  try {
    const dealerSession = req.session.dealer;
    if (!dealerSession) return res.redirect('/dealer-auth/login');

    const stock = await Stock.findById(req.params.id);
    if (!stock) return res.status(404).send('Not found');

    if (stock.dealer.toString() !== dealerSession._id.toString()) {
      return res.status(403).send('Not allowed');
    }

    // delete image file
    if (stock.image) {
      const imgPath = path.join(__dirname, '..', 'public', 'uploads', stock.image);
      try { if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath); } catch(e){ console.warn('img delete err', e);}
    }

    await Stock.findByIdAndDelete(req.params.id);
    res.redirect('/dealer/dashboard');
  } catch (err) {
    console.error('deleteStock error', err);
    res.status(500).send('Error deleting');
  }
};

exports.showEditForm = async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id);
    if (!stock) return res.status(404).send('Not found');
    if (!req.session.dealer || stock.dealer.toString() !== req.session.dealer._id.toString()) {
      return res.status(403).send('Not allowed');
    }
    res.render('stock/editStock', { stock });
  } catch (err) {
    console.error('showEditForm error', err);
    res.status(500).send('Server error');
  }
};

exports.updateStock = async (req, res) => {
  try {
    const dealerSession = req.session.dealer;
    if (!dealerSession) return res.redirect('/dealer-auth/login');

    const stock = await Stock.findById(req.params.id);
    if (!stock) return res.status(404).send('Not found');
    if (stock.dealer.toString() !== dealerSession._id.toString()) return res.status(403).send('Not allowed');

    const {
      title, category, brand='', variety='', quantity, quantityUnit='Kg', price, shopName='', village='', taluk='', district=''
    } = req.body;

    if (req.file) {
      // delete old image
      if (stock.image) {
        const old = path.join(__dirname, '..', 'public', 'uploads', stock.image);
        try { if (fs.existsSync(old)) fs.unlinkSync(old); } catch(e){ console.warn(e); }
      }
      stock.image = req.file.filename;
    }

    stock.title = title;
    stock.category = category;
    stock.brand = brand;
    stock.variety = variety;
    stock.quantity = Number(quantity);
    stock.quantityUnit = quantityUnit;
    stock.price = Number(price);
    stock.availability = Number(quantity) > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK';
    stock.shopName = shopName || dealerSession.shopName || '';
    stock.location = { village, taluk, district };

    await stock.save();

    res.redirect('/dealer/dashboard');
  } catch (err) {
    console.error('updateStock error', err);
    res.status(500).send('Error updating');
  }
};
