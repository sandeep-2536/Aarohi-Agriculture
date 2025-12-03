const express = require("express");
const router = express.Router();

router.get("/:lang", (req, res) => {
  const lang = req.params.lang;

  if (!["en", "hi", "kn"].includes(lang)) return res.redirect("back");

  res.cookie("aarohi_lang", lang, { maxAge: 365 * 24 * 60 * 60 * 1000 });
  req.session.lang = lang;

  res.redirect("back");
});

module.exports = router;
