const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  express.static(path.join(__dirname), {
    setHeaders: (res, filePath) => {
      // Never cache aggressively: this app gets iterated on frequently.
      res.setHeader("Cache-Control", "no-cache");
    },
  })
);

// Single-page app: any other route falls back to index.html.
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
