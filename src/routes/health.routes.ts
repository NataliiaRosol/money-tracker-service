import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (req, res) => {
    res.status(200).json({ success: true, message: "Server is healthy" });
});