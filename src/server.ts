import express from "express";
import dotenv from "dotenv";
import routes from "./routes.js";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use("/sentinelauth/api/v1", routes);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`SentinelAuth running on port ${port}`);
});
