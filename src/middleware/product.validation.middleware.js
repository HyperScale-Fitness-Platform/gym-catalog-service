function validateProduct(options = {}) {
  const { partial = false } = options;
  const allowed = [
    "name",
    "description",
    "category",
    "price_cents",
    "stock_qty",
    "is_active",
  ];

  return (req, res, next) => {
    const body = req.body || {};

    // Reject unexpected fields on update/create
    const unexpected = Object.keys(body).filter((k) => !allowed.includes(k));
    if (unexpected.length > 0) {
      return res.status(400).json({ message: "Unexpected fields", unexpected });
    }

    if (!partial) {
      // creation: required fields
      if (
        !body.name ||
        typeof body.name !== "string" ||
        body.name.length > 200
      ) {
        return res.status(400).json({ message: "Invalid name" });
      }
      if (!body.category || typeof body.category !== "string") {
        return res.status(400).json({ message: "Invalid category" });
      }
      if (
        body.price_cents === undefined ||
        typeof body.price_cents !== "number" ||
        body.price_cents < 0
      ) {
        return res.status(400).json({ message: "Invalid price_cents" });
      }
      if (
        body.stock_qty !== undefined &&
        (typeof body.stock_qty !== "number" || body.stock_qty < 0)
      ) {
        return res.status(400).json({ message: "Invalid stock_qty" });
      }
    } else {
      // partial update: validate types if present
      if (
        body.name &&
        (typeof body.name !== "string" || body.name.length > 200)
      ) {
        return res.status(400).json({ message: "Invalid name" });
      }
      if (body.category && typeof body.category !== "string") {
        return res.status(400).json({ message: "Invalid category" });
      }
      if (
        body.price_cents !== undefined &&
        (typeof body.price_cents !== "number" || body.price_cents < 0)
      ) {
        return res.status(400).json({ message: "Invalid price_cents" });
      }
      if (
        body.stock_qty !== undefined &&
        (typeof body.stock_qty !== "number" || body.stock_qty < 0)
      ) {
        return res.status(400).json({ message: "Invalid stock_qty" });
      }
    }

    next();
  };
}

function validateListQuery(req, res, next) {
  const { category, is_active, limit, page } = req.query;

  if (category && typeof category !== "string") {
    return res.status(400).json({ message: "Invalid category" });
  }
  if (
    is_active !== undefined &&
    !(is_active === "true" || is_active === "false")
  ) {
    return res.status(400).json({ message: "Invalid is_active" });
  }

  if (limit !== undefined) {
    const n = Number(limit);
    if (!Number.isInteger(n) || n <= 0 || n > 100) {
      return res.status(400).json({ message: "Invalid limit" });
    }
  }
  if (page !== undefined) {
    const p = Number(page);
    if (!Number.isInteger(p) || p <= 0) {
      return res.status(400).json({ message: "Invalid page" });
    }
  }

  next();
}

function validateStockOp(req, res, next) {
  const { quantity } = req.body || {};
  if (quantity === undefined) {
    return res.status(400).json({ message: "quantity is required" });
  }
  const q = Number(quantity);
  if (!Number.isInteger(q) || q <= 0) {
    return res
      .status(400)
      .json({ message: "quantity must be a positive integer" });
  }
  req.body.quantity = q;
  next();
}

module.exports = { validateProduct, validateListQuery, validateStockOp };
