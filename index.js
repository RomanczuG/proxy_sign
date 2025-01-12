// index.js
const express = require("express");
const fetch = require("node-fetch");
const FormData = require("form-data");
const https = require("https");

const app = express();

// We’ll parse incoming form-data (multipart)
const multer  = require('multer');
const upload = multer();

// This agent will ignore invalid SSL certificates
const agent = new https.Agent({
  rejectUnauthorized: false,
});

app.post("/sign", upload.any(), async (req, res) => {
  try {
    // 1. Extract the form fields and file(s) from `req`
    //    They come from `multipart/form-data`
    //    In your original code, you had fields: 'shortcutName' + file: 'shortcut'

    // Get field values by name
    const shortcutName = req.body.shortcutName || "defaultName";

    // The file is in req.files (multer puts them in an array). 
    // We assume one file is named 'shortcut'.
    const shortcutFile = req.files.find(f => f.fieldname === 'shortcut');

    // 2. Create a new FormData to forward to the original signing service
    const formData = new FormData();
    formData.append("shortcutName", shortcutName);
    formData.append(
      "shortcut",
      shortcutFile.buffer,  // the binary data
      {
        filename: shortcutFile.originalname || "shortcut.plist",
        contentType: shortcutFile.mimetype || "application/octet-stream",
      }
    );

    // 3. Forward this to the old signing endpoint, ignoring SSL
    const hubSignUrl = "https://hubsign.routinehub.services/sign"; 
    const response = await fetch(hubSignUrl, {
      method: "POST",
      body: formData,
      agent,                  // <= This bypasses invalid cert
    });

    // 4. Return the result to the client
    const respBuffer = await response.arrayBuffer();
    // Some clients expect JSON, others expect raw bytes. Adjust as needed.
    // If your original code expects raw bytes (the signed .shortcut), do:
    res.status(response.status);
    res.setHeader("Content-Type", response.headers.get("content-type") || "application/octet-stream");
    return res.send(Buffer.from(respBuffer));

  } catch (error) {
    console.error("Error in proxy /sign route:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.get("/", (req, res) => {
  res.send("Proxy is running. POST /sign with your form data.");
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Proxy server listening on port ${port}`);
});
