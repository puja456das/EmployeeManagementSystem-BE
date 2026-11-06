const express = require("express");
const controller = require("../controllers/profileController");
const authenticate = require("../middleware/authMiddleware");
const router = express.Router();

router.use(authenticate);
router.get("/", controller.getProfile);
router.get("/photo", controller.getProfilePhoto);
router.put("/", controller.replaceProfile);
router.patch("/", controller.updateProfile);
router.get("/activity", controller.getActivity);
module.exports = router;
