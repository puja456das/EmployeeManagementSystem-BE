const express = require("express");
const controller = require("../controllers/payrollController");
const authenticate = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const router = express.Router();

router.use(authenticate, allowRoles("hr", "employee"));
router.get("/summary", controller.getPayrollSummary);
router.get("/employee/:employeeId", allowRoles("hr"), controller.getEmployeePayroll);
router.get("/", controller.listPayroll);
router.get("/:id/payslip", controller.getPayslip);
router.patch("/:id/mark-paid", allowRoles("hr"), controller.markPayrollPaid);
router.get("/:id", allowRoles("hr"), controller.get);
router.post("/", allowRoles("hr"), controller.create);
router.patch("/:id", allowRoles("hr"), controller.update);
router.delete("/:id", allowRoles("hr"), controller.remove);
module.exports = router;
