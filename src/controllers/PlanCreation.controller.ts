import { Controller, NotFoundException, Post } from "gonest";
import { PlanCreationService } from "../services";
import { NextFunction, Request, Response } from "express";

@Controller("plan-creation")
class PlanCreationController {
  planCreationService: PlanCreationService;

  constructor() {
    this.planCreationService = new PlanCreationService();
  }

  @Post("/transcribe")
  async transcribe(req: Request, res: Response, next: NextFunction) {
    try {
      const { youtubeUrl } = req.body;

      if (!youtubeUrl) {
        throw new NotFoundException("YouTube URL not specified!");
      }

      const result = await this.planCreationService.transcribe(youtubeUrl);

      res.status(200).json(result);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
}

export default PlanCreationController;
