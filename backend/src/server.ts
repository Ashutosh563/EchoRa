import { createApp } from "./app.js";

const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT) || 4000;

const app = createApp();

app.listen(PORT, HOST, () => {
  console.log(`[sonora] backend listening on http://${HOST}:${PORT}`);
});

