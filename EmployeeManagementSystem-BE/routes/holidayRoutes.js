const express = require("express");
const controller = require("../controllers/holidayController");
const authenticate = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const router = express.Router();

router.use(authenticate, allowRoles("hr", "employee"));
router.get("/", controller.list);
router.get("/:id", controller.get);
router.post("/", allowRoles("hr"), controller.create);
router.patch("/:id", allowRoles("hr"), controller.update);
router.delete("/:id", allowRoles("hr"), controller.remove);
module.exports = router;
