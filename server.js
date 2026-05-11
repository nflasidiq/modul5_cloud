require("dotenv").config();

const express = require("express");
const multer = require("multer");
const mysql = require("mysql2");
const AWS = require("aws-sdk");
const path = require("path");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// =======================
// MULTER CONFIG
// =======================

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// =======================
// AWS S3 CONFIG
// =======================

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

// =======================
// MYSQL RDS CONFIG
// =======================

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.log("Database gagal connect:", err);
  } else {
    console.log("Database connected!");
  }
});

// =======================
// ROUTES
// =======================

app.post("/submit", upload.single("file"), async (req, res) => {
  try {
    const nama = req.body.nama;
    const email = req.body.email;
    const file = req.file;

    // nama file unik
    const fileName = Date.now() + "-" + file.originalname;

    // upload ke S3
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `uploads/${fileName}`,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    const uploadResult = await s3.upload(params).promise();

    const imageUrl = uploadResult.Location;

    // simpan ke database
    const sql = `
            INSERT INTO mahasiswa (nama, email, ktm_url)
            VALUES (?, ?, ?)
        `;

    db.query(sql, [nama, email, imageUrl], (err, result) => {
      if (err) {
        console.log(err);
        return res.send("Gagal simpan ke database");
      }

      res.send(`
                <h2>Data berhasil dikirim!</h2>

                <p>Nama: ${nama}</p>
                <p>Email: ${email}</p>

                <img src="${imageUrl}" width="300">
            `);
    });
  } catch (error) {
    console.log(error);
    res.send("Terjadi error");
  }
});

// =======================
// SERVER
// =======================

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
