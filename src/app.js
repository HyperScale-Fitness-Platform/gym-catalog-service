const express = require("express");
const productRoutes = require("./routes/product.routes");
const errorHandler = require("./middleware/errorHandler.middleware");
const notFound = require("./middleware/notFound.middleware");
const auth = require("./middleware/auth.middleware");

const app = express();

app.use(express.json());
// populate req.user from gateway headers
app.use(auth);

app.use("/api/products", productRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
