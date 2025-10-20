// routes/ai-disease.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const upload = multer({ storage: multer.memoryStorage() });

// Initialize Gemini client (replace key with yours)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* GET /ai-disease */
router.get("/", (req, res) => {
  res.render("ai-disease");
});

/* POST /ai-disease/detect */
router.post("/detect", upload.single("leafImage"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
    Analyze the provided image of a crop leaf. Identify the primary disease, if any.
    Respond **only** in valid JSON (no markdown, no extra text).
    Schema:
    {
      "disease": "Name or 'Healthy'",
      "symptoms": "Brief description",
      "treatment": {
        "organic": ["List of organic treatments"],
        "chemical": ["List of chemical pesticides"],
        "advice": "General advice"
      }
    }`;

    const imagePart = {
      inlineData: {
        data: req.file.buffer.toString("base64"),
        mimeType: req.file.mimetype,
      },
    };

  const result = await model.generateContent([prompt, imagePart]);
  const response = await result.response;
  // Read the response text once and await it. `response.text()` can only be
  // consumed a single time, so we must await here to get the string.
  const text = await response.text();

    // Clean Gemini output
    let cleanedText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .replace(/^.*?\{/, "{")
      .replace(/\}[^}]*$/, "}")
      .trim();

    // console.log("🧾 Gemini raw output:", text);
    // console.log("✅ Cleaned output:", cleanedText);

    let parsedData;
    try {
      parsedData = JSON.parse(cleanedText);
    } catch (parseErr) {
      console.error("❌ Failed to parse JSON:", cleanedText);
      return res.status(500).json({
        error: "AI model did not return valid JSON. Please try again.",
      });
    }

    res.json(parsedData);
  } catch (error) {
    console.error("❌ Error in /ai-disease/detect:", error);
    res.status(500).json({
      error: error.message || "Failed to analyze the image.",
    });
  }
});

module.exports = router;
