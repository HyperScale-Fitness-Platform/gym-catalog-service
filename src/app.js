const express = require("express");
const cors = require("cors");
const productRoutes = require("./routes/product.routes");
const errorHandler = require("./middleware/errorHandler.middleware");
const notFound = require("./middleware/notFound.middleware");
const auth = require("./middleware/auth.middleware");

const app = express();

app.use(express.json());
// populate req.user from gateway headers
app.use(auth);

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  }),
);

app.use("/api/products", productRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
