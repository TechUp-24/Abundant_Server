"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CookiesController = exports.PlanCreationController = exports.DemoController = void 0;
const demo_controller_1 = require("./demo.controller");
Object.defineProperty(exports, "DemoController", { enumerable: true, get: function () { return demo_controller_1.DemoController; } });
const PlanCreation_controller_1 = __importDefault(require("./PlanCreation.controller"));
exports.PlanCreationController = PlanCreation_controller_1.default;
const Cookies_controller_1 = require("./Cookies.controller");
Object.defineProperty(exports, "CookiesController", { enumerable: true, get: function () { return Cookies_controller_1.CookiesController; } });
