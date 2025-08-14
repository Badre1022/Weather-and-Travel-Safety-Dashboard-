require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(morgan("dev"));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Schema
const reportSchema = new mongoose.Schema({
  location: {
    country: String,
    city: String,
    latitude: Number,
    longitude: Number,
  },
  covid19: {
    updated: String,
    cases: Number,
    todayCases: Number,
    deaths: Number,
    todayDeaths: Number,
    recovered: Number,
    active: Number,
    critical: Number,
    casesPerOneMillion: Number,
    deathsPerOneMillion: Number,
  },
  weather: {
    temperature: {
      current: Number,
      feels_like: Number,
      min: Number,
      max: Number,
    },
    humidity: Number,
    pressure: Number,
    wind_speed: Number,
    description: String,
    icon: String,
  },
  metadata: {
    timestamp: String,
    source_apis: [String],
  },
});

const Report = mongoose.model("Report", reportSchema);

// Health Check
app.get("/health", (req, res) => {
  res.send("Server is up and running 🚀");
});

// Save report
app.post("/api/weather-safety-data", async (req, res) => {
  try {
    // API Key check
    if (req.headers["x-api-key"] !== process.env.API_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const newReport = new Report(req.body);
    await newReport.save();
    res.status(201).json({ message: "✅ Report saved successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get reports
app.get("/api/user-searches", async (req, res) => {
  try {
    if (req.headers["x-api-key"] !== process.env.API_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { country, limit = 10 } = req.query;
    const filter = country ? { "location.country": country } : {};

    const reports = await Report.find(filter)
      .sort({ "metadata.timestamp": -1 })
      .limit(parseInt(limit));

    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TravelSafe Hub backend running at http://localhost:${PORT}`);
});
