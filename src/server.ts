import "dotenv/config";
import app from "./app.js";
import { logger } from "./utils/logger.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(
    `API documentation available at http://localhost:${PORT}/api/docs`,
  );
});
