import express from "express";
import ImageKit from "imagekit";
const uploadRoute = express.Router();

const imagekit = new ImageKit({
  urlEndpoint: process.env.IMAGE_KIT_ENDPOINT,
  publicKey: process.env.IMAGE_KIT_PUBLIC_KEY,
  privateKey: process.env.IMAGE_KIT_PRIVATE_KEY,
});

uploadRoute.get("/", (req, res) => {
  const result = imagekit.getAuthenticationParameters();
  res.send(result);
});


// module.exports = uploadRoute;
export default uploadRoute;