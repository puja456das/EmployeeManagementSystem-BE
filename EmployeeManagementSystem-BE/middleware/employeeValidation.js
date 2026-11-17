const { body, validationResult } = require("express-validator");

const validateEmployee = [
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Employee name is required")
        .isLength({ max: 150 })
        .withMessage("Employee name must be 150 characters or fewer"),

    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Enter a valid email address")
        .normalizeEmail(),

    body("department").custom((department, { req }) => {
        if (!String(req.body.department_id || "").trim() && !String(department || "").trim()) {
            throw new Error("Department is required");
        }
        return true;
    }),

    body("salary")
        .notEmpty()
        .withMessage("Salary is required")
        .isFloat({ min: 0 })
        .withMessage("Salary must be a valid non-negative number")
        .custom((value) => Number(value) <= 9999999999.99 && Math.abs(Math.round(Number(value) * 100) - Number(value) * 100) < 1e-7)
        .withMessage("Salary cannot exceed 9,999,999,999.99 or have more than two decimal places"),

    body("joining_date")
        .optional({ values: "falsy" })
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .custom((value) => new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value)
        .withMessage("Joining date must be a valid calendar date"),

    body("status")
        .optional()
        .isIn(["Active", "Inactive"])
        .withMessage("Choose Active or Inactive status"),

    body("annual_paid_leave_days")
        .optional({ values: "falsy" })
        .isInt({ min: 0, max: 365 })
        .withMessage("Annual paid leave allowance must be between 0 and 365 days")
        .toInt(),

    (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        next();
    }
];

module.exports = validateEmployee;
