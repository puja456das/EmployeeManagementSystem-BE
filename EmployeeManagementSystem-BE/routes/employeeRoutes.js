
const express = require("express");

const router = express.Router();

const {
    getEmployees,
    getEmployeeById,
    getEmployeePhoto,
    addEmployee,
    updateEmployee,
    patchEmployee,
    deleteEmployee
} = require("../controllers/employeeController");

const validateEmployee = require("../middleware/employeeValidation");
const profileImageUpload = require("../middleware/profileImageUpload");
const authenticate = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

router.use(authenticate, allowRoles("admin", "hr"));

// GET - All Employees
router.get("/", getEmployees);

// GET - Employee Profile Photo
router.get("/:id/photo", getEmployeePhoto);

// GET - Employee By ID
router.get("/:id", getEmployeeById);

// POST - Add Employee (With Validation)
router.post("/", profileImageUpload.single("profile_image"), validateEmployee, addEmployee);

// PUT - Full Update Employee (With Validation)
router.put("/:id", profileImageUpload.single("profile_image"), validateEmployee, updateEmployee);

// PATCH - Partial Update Employee
router.patch("/:id", profileImageUpload.single("profile_image"), patchEmployee);

// DELETE - Delete Employee
router.delete("/:id", deleteEmployee);

module.exports = router;
