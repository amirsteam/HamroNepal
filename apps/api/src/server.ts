import { createApp } from "./app";
import { assertServerConfig, config } from "./config";
import { connectDB } from "./db";

assertServerConfig();
await connectDB();

createApp().listen(config.port, () => {
  console.log(`HamroNepal API listening on http://localhost:${config.port}`);
});
