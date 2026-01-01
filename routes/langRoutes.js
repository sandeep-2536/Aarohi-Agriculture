const express = require("express");
const router = express.Router();

router.get("/:lang", (req, res) => {
    const lang = req.params.lang;

    if (["en", "hi", "kn"].includes(lang)) {
        res.cookie("aarohi_lang", lang, { maxAge: 90000000 });
    }

    res.redirect("back");
});

module.exports = router;
