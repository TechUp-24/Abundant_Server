"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
exports.Invest = Invest;
const gonest_1 = require("gonest");
const controllers_1 = require("./controllers");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function Invest() {
    // Define the application module with controllers and global prefix
    const appModule = {
        controllers: [controllers_1.DemoController, controllers_1.PlanCreationController, controllers_1.CookiesController],
        globalPrefix: "api/v1",
    };
    const app = gonest_1.GonestFactory.create(appModule);
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
exports.app = Invest();
