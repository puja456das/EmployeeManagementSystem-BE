const express = require("express");
const controller = require("../controllers/leaveController");
const authenticate = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const router = express.Router();

router.use(authenticate);
router.get("/balances", allowRoles("admin", "hr"), controller.getLeaveBalances);
router.get("/balance/me", controller.getMyLeaveBalance);
router.get("/", controller.getLeaves);
router.post("/", controller.requestLeave);
router.get("/:id", controller.getLeave);
router.put("/:id", controller.updateLeave);
router.post("/:id/cancel", controller.cancelLeave);
router.patch("/:id/review", allowRoles("admin", "hr"), controller.reviewLeave);
router.delete("/:id", controller.deleteLeave);
module.exports = router;
