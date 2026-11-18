const express = require("express");
const controller = require("../controllers/leaveController");
const authenticate = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");
const router = express.Router();

router.use(authenticate, allowRoles("hr", "employee"));
router.get("/balances", allowRoles("hr"), controller.getLeaveBalances);
router.get("/balance/me", controller.getMyLeaveBalance);
router.get("/", controller.getLeaves);
router.post("/", allowRoles("employee"), upload.single("medical_document"), controller.requestLeave);
router.get("/:id/document", controller.downloadMedicalDocument);
router.get("/:id", controller.getLeave);
router.put("/:id", allowRoles("employee"), upload.single("medical_document"), controller.updateLeave);
router.post("/:id/cancel", allowRoles("employee"), controller.cancelLeave);
router.patch("/:id/review", allowRoles("hr"), controller.reviewLeave);
router.delete("/:id", allowRoles("employee"), controller.deleteLeave);
module.exports = router;
