import { NextFunction, Request, Response } from "express";
import { Controller, Post } from "gonest";
import { ChatbotService } from "../services";

@Controller("chatbot")
class ChatbotController {
  chatbotService: ChatbotService;
  constructor() {
    this.chatbotService = new ChatbotService();
  }

  @Post("/chat")
  async get(req: Request, res: Response, next: NextFunction) {
    const {
      message,
      previousMessages,
      gigDetails,
      gender = "female",
    } = req.body;
    console.log("Body Request: ", req.body);
    try {
      const response = await this.chatbotService.get(
        message,
        previousMessages,
        gigDetails,
        gender
      );

      console.log("Response is going: ", response)

      return res.status(200).json(response);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
}

export default ChatbotController;
