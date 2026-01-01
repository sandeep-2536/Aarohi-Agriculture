// middlewares/isVetAuth.js
module.exports = function (req, res, next) {
  if (req.session && req.session.vet) return next();
  return res.redirect("/vet-auth/login");
};
