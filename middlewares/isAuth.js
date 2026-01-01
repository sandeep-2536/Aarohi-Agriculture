// middlewares/isAuth.js
module.exports = function (req, res, next) {
  if (req.session && req.session.user) return next();
  // redirect to login or show message
  return res.redirect('/auth/login'); // adjust path if your login route differs
};
