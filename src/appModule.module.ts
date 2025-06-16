import { GonestFactory } from "gonest";
import {
  CookiesController,
  DemoController,
  PlanCreationController,
} from "./controllers";
import dotenv from "dotenv";

dotenv.config();

export function Invest() {
  // Define the application module with controllers and global prefix
  const appModule = {
    controllers: [DemoController, PlanCreationController, CookiesController],
    globalPrefix: "api/v1",
  };

  const app = GonestFactory.create(appModule);

  app.setApplicationName("Gonest");

  // Enable Cross-Origin Resource Sharing
  app.enableCors({
    origin: ["http://localhost:3000", "https://www.abundantvisas.com"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  // Allow JSON data parsing in requests
  app.enableJsonParsing();

  // Enable URL-encoded form parsing
  app.urlEncodedParser();

  // Define a simple root route
  app.get("/", (req, res) => {
    res.send("Hello from Gonest!");
  });

  // Display all registered routes
  app.listAllRoutes();

  // Set up global exception handling (This is a must!).
  app.exceptionHandler();

  // Start the server on port 8080
  app.listen(8080);

  // Return the initialized Gonest application instance
  return app;
}

// Export the application instance for use in other parts of the project
export const app = Invest();
