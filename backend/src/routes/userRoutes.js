// backend/src/routes/userRoutes.js
import { Router } from "express";
import {
  registerUser,
  loginUser,
  updateUserProfile,
  updateUserPassword,
  updateUserScores,
  getLeaderboard,
} from "../controllers/userController.js";

const router = Router();

// GET /api/users/leaderboard
router.get("/leaderboard", getLeaderboard);

// POST /api/users/register
router.post("/register", registerUser);

// POST /api/users/login
router.post("/login", loginUser);

// PUT /api/users/:id  -> update username, avatarPath, ...
router.put("/:id", updateUserProfile);

// PUT /api/users/:id/password  -> change password
router.put("/:id/password", updateUserPassword);

// PUT /api/users/:id/scores  -> update points, highScore, totalPoints
router.put("/:id/scores", updateUserScores);

export default router;