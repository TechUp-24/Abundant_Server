import { ApiResponse, Controller, Get } from "gonest";
import DemoService from "../services/demo.service";
import { NextFunction, Request, Response } from "express";

@Controller("demo") // Base route: /api/v1/demo
export class DemoController {
  demoService: DemoService;

  constructor() {
    this.demoService = new DemoService();
  }

  /**
   * Handles GET requests to "/api/v1/demo/route".
   * @returns A simple JSON response.
   */
  @Get("/route")
  async demo(req: Request, res: Response, next: NextFunction) {
    try {

      const userId = 938567890

      const response = await this.demoService.demo(userId);

      return res.status(200).json(new ApiResponse(200, response, "Success"));
    } catch (error: any) {
      next(error);
    }
  }
}