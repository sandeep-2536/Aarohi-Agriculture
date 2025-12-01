// middlewares/isDealerAuth.js
module.exports = function (req, res, next) {
  if (req.session && req.session.dealer) return next();
  res.redirect('/dealer-auth/login');
};
