async function publishStockChanged(product) {
  // TODO: wire to Kafka once broker/topic contract is decided with the team
  console.log("stock changed (stub):", product.id, product.stock_qty);
}

module.exports = { publishStockChanged };
