const express = require("express");
const controller = require("../controllers/holidayController");
const authenticate = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const router = express.Router();

router.use(authenticate);
router.get("/", controller.list);
router.get("/:id", controller.get);
router.post("/", allowRoles("admin", "hr"), controller.create);
router.patch("/:id", allowRoles("admin", "hr"), controller.update);
router.delete("/:id", allowRoles("admin"), controller.remove);
module.exports = router;
