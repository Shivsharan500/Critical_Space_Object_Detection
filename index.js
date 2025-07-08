const express = require("express");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 3000;
const path = require("path");
const fs = require("fs");
const { google } = require("googleapis");
const bodyParser = require("body-parser");
const { exec } = require("child_process");




app.set("view engine","views");
app.set("views",path.join(__dirname,"views"));
app.use(bodyParser.json({ limit: "10mb" }));
app.use(express.json());



const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json",
  scopes: ["https://www.googleapis.com/auth/drive.file"],
});
const drive = google.drive({ version: "v3", auth });

const FOLDER_ID = process.env.DRIVE_INPUT_FOLDER_ID

app.post("/upload", async (req, res) => {
  try {
    const base64Data = req.body.image.replace(/^data:image\/png;base64,/, "");
    const filePath = "capture.png";

    fs.writeFileSync(filePath, base64Data, "base64");

    const fileMetadata = {
      name: `capture_${Date.now()}.png`,
      parents: [FOLDER_ID],
    };
    const media = {
      mimeType: "image/png",
      body: fs.createReadStream(filePath),
    };

    const driveRes = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: "id",
    });

    // Optional: delete the local file after upload
    fs.unlinkSync(filePath);

    res.json({ message: "Uploaded to Drive!", fileId: driveRes.data.id });
  } catch (err) {
    console.error(err);
    res.status(500).send("Upload failed");
  }
});

app.post("/predict", (req, res) => {
  exec("python drive_yolo_predict.py", (error, stdout, stderr) => {
    if (error) {
      console.error("Prediction error:", error);
      return res.status(500).json({ success: false });
    }

    const base64Result = fs.readFileSync("result_base64.txt", "utf8");

    // Cleanup
    fs.unlinkSync("result_base64.txt");

    res.json({ success: true, predictedImage: base64Result });
  });
});




app.listen(port,() => {
    console.log(`Server Listening to port:${port}`);
});

app.get("/",(req,res) => {
    res.render("home.ejs");
});