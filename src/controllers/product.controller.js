const {
  createProduct,
  getProductById,
  listProducts,
  updateProduct,
  deleteProduct,
  reserveStock,
  releaseStock,
} = require("../models/product.model");

const { publishStockChanged } = require("../events/producers/product.producer");

async function list(req, res, next) {
  try {
    const { category, is_active } = req.query;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const offset = page ? (page - 1) * limit : Number(req.query.offset || 0);

    const items = await listProducts({
      category,
      is_active: is_active === undefined ? undefined : is_active === "true",
      limit,
      offset,
    });
    res.json(items);
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const product = await getProductById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const product = await createProduct(req.body);
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const product = await updateProduct(req.params.id, req.body);
    if (!product) return res.status(404).json({ message: "Product not found" });
    // publish stock changed if stock was part of update
    if (req.body.stock_qty !== undefined) {
      try {
        await publishStockChanged(product);
      } catch (e) {
        console.warn("Failed to publish stock changed:", e);
      }
    }
    res.json(product);
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    await deleteProduct(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

async function reserveStockHandler(req, res, next) {
  try {
    const { quantity } = req.body;
    const product = await reserveStock(req.params.id, quantity);
    if (!product)
      return res
        .status(409)
        .json({ message: "Insufficient stock or inactive product" });
    try {
      await publishStockChanged(product);
    } catch (e) {
      console.warn("Failed to publish stock changed:", e);
    }
    res.json(product);
  } catch (error) {
    next(error);
  }
}

async function releaseStockHandler(req, res, next) {
  try {
    const { quantity } = req.body;
    const product = await releaseStock(req.params.id, quantity);
    if (!product) return res.status(404).json({ message: "Product not found" });
    try {
      await publishStockChanged(product);
    } catch (e) {
      console.warn("Failed to publish stock changed:", e);
    }
    res.json(product);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  reserveStock: reserveStockHandler,
  releaseStock: releaseStockHandler,
};
