"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DemoController = void 0;
const gonest_1 = require("gonest");
const demo_service_1 = __importDefault(require("../services/demo.service"));
let DemoController = class DemoController {
    constructor() {
        this.demoService = new demo_service_1.default();
    }
    /**
     * Handles GET requests to "/api/v1/demo/route".
     * @returns A simple JSON response.
     */
    demo(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = 938567890;
                const response = yield this.demoService.demo(userId);
                return res.status(200).json(new gonest_1.ApiResponse(200, response, "Success"));
            }
            catch (error) {
                next(error);
            }
        });
    }
};
exports.DemoController = DemoController;
__decorate([
    (0, gonest_1.Get)("/route"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Function]),
    __metadata("design:returntype", Promise)
], DemoController.prototype, "demo", null);
exports.DemoController = DemoController = __decorate([
    (0, gonest_1.Controller)("demo") // Base route: /api/v1/demo
    ,
    __metadata("design:paramtypes", [])
], DemoController);
