import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import routes from "@/routes/index.js";

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

app.use('/api', routes);

app.get("/", (req, res) => {
  res.send("API is running");
});

app.use('/api', routes);


export default app;