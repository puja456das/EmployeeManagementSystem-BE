const express = require("express");
const controller = require("../controllers/departmentController");
const authenticate = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const router = express.Router();

router.use(authenticate);
router.get("/:id/employees", allowRoles("admin", "hr"), controller.listEmployees);
router.get("/", allowRoles("admin", "hr"), controller.list);
router.get("/:id", allowRoles("admin", "hr"), controller.get);
router.post("/", allowRoles("admin", "hr"), controller.create);
router.patch("/:id", allowRoles("hr"), controller.update);
router.delete("/:id", allowRoles("admin", "hr"), controller.remove);
module.exports = router;
