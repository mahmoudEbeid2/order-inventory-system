import dotenv from "dotenv";
import app from "./app.js";

dotenv.config();

const PORT = process.env.PORT || 3000;

console.log("Starting server...");

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
