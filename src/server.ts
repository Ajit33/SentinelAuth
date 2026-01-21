import express from "express";
import dotenv from "dotenv";
import routes from "./routes.js";

dotenv.config();

const app = express();
app.use(express.json());

app.use("/sentinelauth/api/v1", routes);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`SentinelAuth running on port ${port}`);
});
