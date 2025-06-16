import { NextFunction, Request, Response } from "express"; // Gonest uses Express internally
import { Controller, Post } from "gonest";
import { CookiesService } from "../services";

@Controller("cookies")
export class CookiesController {
  cookiesService: CookiesService;

  constructor() {
    this.cookiesService = new CookiesService();
  }

  @Post("/update")
  async addCookies(req: Request, res: Response, next: NextFunction) {
    const cookies = req.body?.cookies;

    try {
      const response = await this.cookiesService.addCookies(cookies);
      return res.status(200).json(response);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
}
