const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// Job Schema
const jobSchema = new mongoose.Schema({
  title: String,
  company: String,
  location: String,
  description: String,
});

const Job = mongoose.model("Job", jobSchema);

// Routes
app.get("/", (req, res) => {
  res.send("Job Portal API is Running 🚀");
});

app.get("/jobs", async (req, res) => {
  const jobs = await Job.find();
  res.json(jobs);
});

app.post("/jobs", async (req, res) => {
  const job = new Job(req.body);
  await job.save();
  res.json(job);
});

app.delete("/jobs/:id", async (req, res) => {
  await Job.findByIdAndDelete(req.params.id);
  res.json({ message: "Job deleted" });
});

// Start Server
app.listen(process.env.PORT, () => {
  console.log(`🚀 Server running on port ${process.env.PORT}`);
});
