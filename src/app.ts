
import express from "express";
import { apiRouter } from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { notFoundHandler } from "./middlewares/notFoundHandler.js";


export function createApp() {
    const app = express();
    // app.use(pinoHttp({ logger }));
    app.use(express.json());
    app.use('/api', apiRouter);
    app.use(notFoundHandler);  // 404
    app.use(errorHandler);     // завжди останній


    return app;
}