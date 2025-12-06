import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./api/routes/authRoutes";
import issueRoutes from "./api/routes/issueRoutes";
import commentRoutes from "./api/routes/commentRoutes";
import notificationRoutes from "./api/routes/notificationRoutes";
import { FRONTEND_URL } from "./appconfig";

const app = express();
const port = 3000;

const allowedOrigins = [FRONTEND_URL, "http://localhost:5173", "http://localhost:5174"];
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Public Issues Tracker API");
});

app.use("/auth", authRoutes);
app.use("/issues", issueRoutes);
app.use("/", commentRoutes);
app.use("/notifications", notificationRoutes);

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
});

