import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import url, { fileURLToPath } from "url";


import chatRoute from './routes/chatRoute.js';
import uploadRoute from './routes/uploadRoute.js';

const port = process.env.PORT || 3000;
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());

const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.log(err);
  }
};

app.use("/api/chats", chatRoute);
app.use("/api/upload", uploadRoute);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(401).send("Unauthenticated!");
});

// // PRODUCTION
// app.use(express.static(path.join(__dirname, "../client/dist")));

// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "../client/dist", "index.html"));
// });

app.listen(port, () => {
  connect();
  console.log("Server running on 3000");
});