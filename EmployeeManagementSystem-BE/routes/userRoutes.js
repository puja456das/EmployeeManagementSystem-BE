const express = require("express");
const controller = require("../controllers/userController");
const authenticate = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const router = express.Router();

router.use(authenticate, allowRoles("admin"));
router.get("/roles", controller.listRoles);
router.route("/").get(controller.listUsers).post(controller.createUser);
router.get("/:id", controller.getUser);
router.put("/:id", controller.replaceUser);
router.patch("/:id/role", controller.updateUserRole);
router.post("/:id/reset-password", controller.resetUserPassword);
router.patch("/:id", controller.updateUser);
router.delete("/:id", controller.deleteUser);
module.exports = router;
