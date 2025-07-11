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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CookiesController = void 0;
const gonest_1 = require("gonest");
const services_1 = require("../services");
let CookiesController = class CookiesController {
    constructor() {
        this.cookiesService = new services_1.CookiesService();
    }
    addCookies(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const cookies = (_a = req.body) === null || _a === void 0 ? void 0 : _a.cookies;
            try {
                const response = yield this.cookiesService.addCookies(cookies);
                return res.status(200).json(response);
            }
            catch (error) {
                console.error(error);
                next(error);
            }
        });
    }
};
exports.CookiesController = CookiesController;
__decorate([
    (0, gonest_1.Post)("/update"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Function]),
    __metadata("design:returntype", Promise)
], CookiesController.prototype, "addCookies", null);
exports.CookiesController = CookiesController = __decorate([
    (0, gonest_1.Controller)("cookies"),
    __metadata("design:paramtypes", [])
], CookiesController);
