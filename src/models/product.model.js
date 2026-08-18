const { pool } = require("../config/db");

async function createProduct({
  name,
  description,
  category,
  price_cents,
  stock_qty = 0,
}) {
  const result = await pool.query(
    `INSERT INTO products (name, description, category, price_cents, stock_qty)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [name, description || null, category, price_cents, stock_qty],
  );
  return result.rows[0];
}

async function getProductById(id) {
  const result = await pool.query("SELECT * FROM products WHERE id = $1", [id]);
  return result.rows[0] || null;
}

async function listProducts({ category, is_active, limit = 20, offset = 0 }) {
  const where = [];
  const params = [];
  let idx = 1;

  if (category) {
    where.push(`category = $${idx++}`);
    params.push(category);
  }
  if (is_active !== undefined) {
    where.push(`is_active = $${idx++}`);
    params.push(Boolean(is_active));
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const sql = `SELECT * FROM products ${whereSql} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(limit);
  params.push(offset);

  const result = await pool.query(sql, params);
  return result.rows;
}

async function updateProduct(id, fields = {}) {
  const allowed = [
    "name",
    "description",
    "category",
    "price_cents",
    "stock_qty",
    "is_active",
  ];
  const sets = [];
  const params = [];
  let idx = 1;

  for (const key of allowed) {
    if (key in fields) {
      sets.push(`${key} = $${idx++}`);
      params.push(fields[key]);
    }
  }

  if (sets.length === 0) return getProductById(id);

  sets.push(`updated_at = now()`);
  const sql = `UPDATE products SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`;
  params.push(id);

  const result = await pool.query(sql, params);
  return result.rows[0] || null;
}

async function deleteProduct(id) {
  const result = await pool.query(
    `UPDATE products SET is_active = false, updated_at = now() WHERE id = $1 RETURNING *`,
    [id],
  );
  return result.rows[0] || null;
}

async function reserveStock(id, quantity) {
  const result = await pool.query(
    `UPDATE products
     SET stock_qty = stock_qty - $1, updated_at = now()
     WHERE id = $2 AND stock_qty >= $1 AND is_active = true
     RETURNING *;`,
    [quantity, id],
  );
  return result.rows[0] || null;
}

async function releaseStock(id, quantity) {
  const result = await pool.query(
    `UPDATE products SET stock_qty = stock_qty + $1, updated_at = now() WHERE id = $2 RETURNING *;`,
    [quantity, id],
  );
  return result.rows[0] || null;
}

module.exports = {
  createProduct,
  getProductById,
  listProducts,
  updateProduct,
  deleteProduct,
  reserveStock,
  releaseStock,
};
