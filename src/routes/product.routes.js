const express = require("express");
const controller = require("../controllers/product.controller");
const { authorize } = require("../middleware/role.middleware");
const {
  validateProduct,
  validateListQuery,
  validateStockOp,
} = require("../middleware/product.validation.middleware");

const router = express.Router();

router.get("/", validateListQuery, controller.list);
router.get("/:id", controller.getById);
router.post("/", authorize(["admin"]), validateProduct(), controller.create);
router.put(
  "/:id",
  authorize(["admin"]),
  validateProduct({ partial: true }),
  controller.update,
);
router.delete("/:id", authorize(["admin"]), controller.remove);

// Internal endpoints: intended for service-to-service calls (order-service)
// Not part of the public gateway contract. Protected by role-based header auth.
router.post(
  "/:id/reserve-stock",
  authorize(["admin", "service"]),
  validateStockOp,
  controller.reserveStock,
);
router.post(
  "/:id/release-stock",
  authorize(["admin", "service"]),
  validateStockOp,
  controller.releaseStock,
);

module.exports = router;
