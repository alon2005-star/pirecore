const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const CV = require("./models/CV");

// ---------------- SERVER ------------------
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB conectado"))
  .catch(err => console.error("Error Mongo:", err));

// ----------------- API --------------------

// 1. Guardar CV
app.post("/api/cv", async (req, res) => {
  const cv = await CV.create(req.body);
  res.json(cv);
});

// 2. Traer perfiles públicos
app.get("/api/cv", async (req, res) => {
  const data = await CV.find({}, {
    nombre: 0, genero: 0, estadoCivil: 0, cv_text: 0
  });
  res.json(data);
});

// 3. Dashboard stats
app.get("/api/stats", async (req, res) => {

  const totalProfiles = await CV.countDocuments();

  const avgSalaryData = await CV.aggregate([
    { $group: { _id: null, avg: { $avg: "$salario_esperado" } } }
  ]);
  const avgSalary = avgSalaryData.length ? avgSalaryData[0].avg : 0;

  const availability = await CV.aggregate([
    { $group: { _id: "$disponibilidad", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const topSkills = await CV.aggregate([
    { $unwind: "$habilidades" },
    { $group: { _id: "$habilidades", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 8 }
  ]).then(arr => arr.map(x => ({ skill: x._id, count: x.count })));

  res.json({
    totalProfiles,
    avgSalary,
    availability,
    topSkills
  });
});

// 4. Admin
app.get("/api/cv/full", async (req, res) => {
  if (req.query.key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: "Clave incorrecta" });
  }
  const data = await CV.find();
  res.json(data);
});

// ---------------- RUN SERVER ----------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor escuchando en puerto", PORT));
