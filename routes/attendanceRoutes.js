const express = require("express");
const controller = require("../controllers/attendanceController");
const authenticate = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const router = express.Router();

router.use(authenticate);
router.get("/summary", controller.getAttendanceSummary);
router.get("/", controller.listAttendance);
router.get("/:id", controller.getAttendance);
router.patch("/:id", allowRoles("admin", "hr"), controller.updateAttendance);
router.delete("/:id", allowRoles("admin"), controller.deleteAttendance);
router.post("/check-in", allowRoles("employee"), controller.checkIn);
router.post("/check-out", allowRoles("employee"), controller.checkOut);
router.post("/", allowRoles("admin", "hr"), controller.createAttendance);
module.exports = router;
