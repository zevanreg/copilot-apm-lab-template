import { createApp } from "./server.ts";

const configuredPort = process.env.PORT ?? "3000";
if (
  !/^\d+$/.test(configuredPort) ||
  Number(configuredPort) < 1 ||
  Number(configuredPort) > 65535
) {
  console.error("PORT must be an integer from 1 through 65535.");
  process.exitCode = 1;
} else {
  const app = createApp();
  app.on("error", (error) => {
    console.error("Unable to start the lab API:", error);
    process.exitCode = 1;
  });
  app.listen(Number(configuredPort), "127.0.0.1", () => {
    console.log(`Northstar lab API: http://127.0.0.1:${configuredPort}`);
  });
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      app.close((error) => {
        if (error) {
          console.error("Unable to stop the lab API cleanly:", error);
          process.exitCode = 1;
        }
      });
    });
  }
}
