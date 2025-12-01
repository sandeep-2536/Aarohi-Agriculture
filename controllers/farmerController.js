// farmerController.js - handles farmer dashboard, community, inventory, livestock, marketplace

exports.dashboard = (req, res) => {
  res.render('farmer/dashboard', { title: 'Dashboard' });
};

exports.community = (req, res) => {
  res.render('farmer/community', { title: 'Community' });
};

exports.inventory = (req, res) => {
  res.render('farmer/inventory', { title: 'Inventory' });
};

exports.livestock = (req, res) => {
  res.render('farmer/livestock', { title: 'Livestock' });
};

exports.marketplace = (req, res) => {
  res.render('farmer/marketplace', { title: 'Marketplace' });
};
