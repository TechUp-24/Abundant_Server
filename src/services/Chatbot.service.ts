import axios from "axios";
import dotenv from "dotenv";
import { HttpVersionNotSupportedException } from "gonest";
import { PlanCreationTypes } from "../types";

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

type ChatMessageHistory = {
  content: string;
  senderId: "user" | "assistant";
};

let lastResponse: string | null = null;
let responseCount = 0;

class ChatbotService {
  async get(
    message: string,
    previousMessages: ChatMessageHistory[],
    gigDetails: PlanCreationTypes,
    gender: "male" | "female" = "female"
  ): Promise<{reply: string}> {
    if (!message || typeof message !== "string") {
      throw new HttpVersionNotSupportedException("Missing or invalid message");
    }

    console.log("API KEY", OPENAI_API_KEY);

    if (!OPENAI_API_KEY) {
      throw new HttpVersionNotSupportedException(
        "OpenAI API key not configured"
      );
    }

    const userId = gigDetails.userId; // Replace with real user ID from context if needed

    try {
      // 1. Simple Greeting Check
      if (this.isSimpleGreeting(message)) {
        const greetingResponse = this.getGreetingResponse(message);
        return {reply: greetingResponse};
      }

      // 2. Detect User Tone
      const detectedTone = await this.detectUserTone(message);

      // 3. Detect Buying Interest
      const isInterested = await this.detectBuyingInterest(message);

      const isFirstMessage = previousMessages.length === 0;

      // 4. Check if used service name too often
      const usedServiceTooOften = this.usedServiceNameTooOften(
        previousMessages,
        gigDetails.title || ""
      );

      // 5. Check if asking for missing gig info
      const isAskingMissing = await this.isAskingForMissingGigInfo(
        message,
        gigDetails
      );

      // Build complete message stack
      const messages = await this.buildCompleteMessageStack(
        previousMessages,
        message,
        gigDetails,
        isFirstMessage,
        gender,
        detectedTone,
        usedServiceTooOften,
        isAskingMissing,
        isInterested
      );

      // Get AI response
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions ",
        {
          model: "gpt-3.5-turbo-0125",
          messages,
          temperature: this.calculateTemperature(),
          top_p: 0.9,
          frequency_penalty: 0.5,
          presence_penalty: 0.5,
          max_tokens: 350,
          user: userId,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      let reply =
        response.data.choices[0]?.message?.content?.trim() ??
        "Mujhe samajhne mein thori takleef hui. Zara dobara bata sakte hain?";

      // 6. Sanitize AI Response
      reply = this.sanitizeAiResponse(reply);

      // Check for repeating responses
      if (this.isResponseRepeating(reply)) {
        reply = await this.handleRepetition(messages, reply);
      }

      // Update conversation state
      this.updateConversationState(reply);

      // Break response into parts
      const brokenParts = await this.breakResponseWithAi(reply);
      const finalReply = brokenParts.join("\n");

      return { reply: finalReply };;
    } catch (error) {
      console.error("OpenAI error:", error);
      throw new Error("Maaf kijiye, technical masla ho gaya.");
    }
  }

  private isSimpleGreeting(message: string): boolean {
    const lowerMessage = message.trim().toLowerCase();
    const exactGreetings = ["hi", "hello", "hey", "haan", "yes"];
    const patternGreetings = [/hi\s+there/i, /hello\s+there/i, /^hey\W*$/i];
    return (
      exactGreetings.includes(lowerMessage) ||
      patternGreetings.some((pattern) => pattern.test(lowerMessage))
    );
  }

  private getGreetingResponse(userMessage: string): string {
    const lowerMessage = userMessage.trim().toLowerCase();
    const greetingsMap: Record<string, string> = {
      hi: "Hi",
      hello: "Hello",
      hey: "Hey",
      haan: "Haan",
      yes: "Yes",
    };
    const patternGreetings: Record<string, string> = {
      "hi there": "Hi there",
      "hello there": "Hello there",
    };
    const simpleResponses = [
      "How can I help?",
      "What can I do for you?",
      "How may I help you?",
      "Yes, how can I help?",
      "How can I help you?",
    ];
    const selectedResponse =
      simpleResponses[Math.floor(Math.random() * simpleResponses.length)];
    if (greetingsMap[lowerMessage]) {
      return `${greetingsMap[lowerMessage]}! ${selectedResponse}`;
    }
    for (const [pattern, greeting] of Object.entries(patternGreetings)) {
      if (lowerMessage.includes(pattern)) {
        return `${greeting}! ${selectedResponse}`;
      }
    }
    return selectedResponse;
  }

  private async detectUserTone(message: string): Promise<string> {
    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions ",
        {
          model: "gpt-3.5-turbo-0125",
          messages: [
            {
              role: "system",
              content:
                "You are a tone detector. The user will send a message. Your job is to return one word ONLY from: 'urdu', 'english', or 'mix' based on the tone and language style of the message. No explanation, just the word.",
            },
            {
              role: "user",
              content: message,
            },
          ],
          temperature: 0.2,
          max_tokens: 10,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      return (
        response.data.choices[0]?.message?.content?.trim().toLowerCase() ||
        "mix"
      );
    } catch (error) {
      console.error("Error detecting tone:", error);
      return "mix";
    }
  }

  private async detectBuyingInterest(message: string): Promise<boolean> {
    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions ",
        {
          model: "gpt-3.5-turbo-0125",
          messages: [
            {
              role: "system",
              content:
                "User ne service mein interest dikhaya hai? Sirf 'han' ya 'nahi' mein jawab dein.",
            },
            {
              role: "user",
              content: message,
            },
          ],
          temperature: 0,
          max_tokens: 3,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      const answer =
        response.data.choices[0]?.message?.content?.toLowerCase() ?? "";
      return answer.includes("han") || answer.includes("yes");
    } catch (error) {
      console.error("Error detecting buying interest:", error);
      return false;
    }
  }

  private usedServiceNameTooOften(
    messages: ChatMessageHistory[],
    serviceTitle: string
  ): boolean {
    let count = 0;
    for (const msg of messages) {
      const content = msg.content?.toLowerCase() ?? "";
      if (content.includes(serviceTitle.toLowerCase())) {
        count++;
      }
    }
    return count > 2;
  }

  private sanitizeAiResponse(message: string): string {
    const replacements = [
      { pattern: /\badaab\b/gi, replacement: "Hi" },
      { pattern: /\bmadad\b/gi, replacement: "help" },
      { pattern: /\bsamay\b/gi, replacement: "time" },
      { pattern: /\bsammay\b/gi, replacement: "time" },
    ];
    let sanitized = message;
    for (const { pattern, replacement } of replacements) {
      sanitized = sanitized.replace(pattern, replacement);
    }
    return sanitized;
  }

  private async isAskingForMissingGigInfo(
    userMessage: string,
    gigDetails: Partial<PlanCreationTypes>
  ): Promise<boolean> {
    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions ",
        {
          model: "gpt-3.5-turbo-0125",
          messages: [
            {
              role: "system",
              content: `User ka message: "${userMessage}"
Yeh gig details hain:
"${gigDetails.description}"
User kuch aisa pooch raha hai jo in gig details mein nahi diya gaya?
Sirf 'han' ya 'nahi' mein jawab dein.`,
            },
          ],
          temperature: 0,
          max_tokens: 3,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      const answer =
        response.data.choices[0]?.message?.content?.toLowerCase() ?? "";
      return answer.includes("han") || answer.includes("yes");
    } catch (error) {
      console.error("Error checking missing gig info:", error);
      return false;
    }
  }

  private async buildCompleteMessageStack(
    previousMessages: ChatMessageHistory[],
    userMessage: string,
    gigDetails: Partial<PlanCreationTypes>,
    isFirstMessage: boolean,
    gender: string,
    tone: string,
    usedServiceTooOften: boolean,
    isAskingMissing: boolean,
    isInterested: boolean
  ) {
    const messages = [];

    messages.push({
      role: "system",
      content: this.createSystemPrompt(
        gigDetails,
        isFirstMessage,
        gender,
        tone
      ),
    });

    if (!isFirstMessage) {
      previousMessages.forEach((msg) => {
        messages.push({
          role: msg.senderId === "user" ? "user" : "assistant",
          content: msg.content,
        });
      });
    }

    if (previousMessages.length > 5) {
      const summary = await this.summarizePreviousMessages(previousMessages);
      if (summary) {
        messages.push({
          role: "system",
          content: `Summary of previous discussion: ${summary}`,
        });
      }
    }

    messages.push({
      role: "system",
      content: `Important: Never assume user gender. Always address them with "aap". Only use "${gender.toLowerCase() === "female" ? "muhtarma" : "sahab"}" for yourself.`,
    });

    if (usedServiceTooOften) {
      messages.push({
        role: "system",
        content:
          "Aap bar bar service ka naam use kar rahe hain. Kripya sirf jab zarurat ho tab mention karein.",
      });
    }

    messages.push({
      role: "user",
      content: userMessage,
    });

    if (isAskingMissing && !isFirstMessage) {
      const generatedInfo = await this.generateMissingGigInfoReply(
        userMessage,
        gigDetails
      );
      messages.push({
        role: "system",
        content: `User ne aisi baat poochhi hai jo gig mein nahi thi. Yeh ek short response dein:\n${generatedInfo}`,
      });
    }

    if (isInterested) {
      const customOfferMessage = await this.generateCustomOfferIntro(
        gigDetails,
        gender
      );
      if (customOfferMessage) {
        messages.push({
          role: "system",
          content: customOfferMessage,
        });
      }
    }

    if (previousMessages.length >= 3) {
      messages.push({
        role: "system",
        content: `Yeh baatcheet "${gigDetails.title}" service ke baare mein hai. Is par focus rakhein, lekin naam dobara dobara mat dohraayein.`,
      });
    }

    messages.push({
      role: "system",
      content:
        'Service ka naam sirf zaroorat par hi mention karein. Normally "yeh service" use karein.',
    });

    return messages;
  }

  private async generateMissingGigInfoReply(
    userMessage: string,
    gigDetails: Partial<PlanCreationTypes>
  ): Promise<string> {
    try {
      const description = gigDetails.description?.toString().trim() ?? "";
      const prompt = `User ne yeh message likha: "${userMessage}"
Gig ka description yeh hai:
"${description}"
Sirf usi cheez ka jawab dein jo user ke sawal se directly related ho *aur* gig ke description mein nahi hai. 
Kisi irrelevant topic, generic advice, ya extra offer ka zikar na karein.
Professional aur friendly style mein sirf 1-2 lines mein jawab dein — Roman Urdu + English mix mein.
Agar kuch bhi clear nahi hai, to politely kahe: "Yeh cheez shayad gig mein nahi covered, thoda clarify karen please?"`;
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions ",
        {
          model: "gpt-3.5-turbo-0125",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.65,
          max_tokens: 120,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      return (
        response.data.choices[0]?.message?.content?.trim() ??
        "Aap ka sawal gig description se related nahi lagta. Thoda aur clearly batayein?"
      );
    } catch (error) {
      console.error("Error generating missing gig info reply:", error);
      return "Aap ka sawal gig description se related nahi lagta. Thoda aur clearly batayein?";
    }
  }

  private createSystemPrompt(
    gigDetails: Partial<PlanCreationTypes>,
    isFirstMessage: boolean,
    gender: string,
    tone: string
  ): string {
    const style = gender.toLowerCase() === "female" ? "muhtarma" : "sahab";

    function getLanguageAdjustedInstructions(tone: string): string {
      switch (tone) {
        case "urdu":
          return `Main aik professional ${style} hoon. Yeh guftagu "${gigDetails.title}" service ke hawalay se ho rahi hai.
Sirf Roman Urdu mein jawab dein.
Hidayat:
1. Jawabat mukhtasir aur natural hon (1-3 choti choti lines)
2. Har dafa alag andaaz mein jawab shuru karein
3. "${gigDetails.title}" ka naam baar baar na lein
4. "Madad kar sakta/sakti hoon" jese alfaaz kam istamaal karein
5. Roman Urdu ka istemal karein, sirf Urdu mein likhein
6. "Har qadam par madad" ya "guide karungi" jese jumle avoid karein
7. Human jesa lagne wala, quick aur realistic reply dein`;
        case "english":
          return `You are a professional ${style}. This conversation is about the "${gigDetails.title}" service.
Reply only in English.
Guidelines:
1. Keep replies short and natural (1–3 brief sentences)
2. Start each response differently
3. Do not mention the service title "${gigDetails.title}" repeatedly
4. Avoid phrases like "I can help you with..."
5. Use simple, natural English
6. Avoid repetitive phrases like "I'll guide you every step"
7. Responses should sound human and quick — avoid long paragraphs`;
        default:
          return `Main aik professional ${style} hoon. Yeh conversation "${gigDetails.title}" service ke baare mein hai.
Reply in natural Roman Urdu-English mix.
Guidelines:
1. Responses short aur natural hon (1–3 choti choti sentences)
2. Har response alag tareeke se shuru karein
3. "${gigDetails.title}" service ka naam baar baar mat lein
4. "Madad kar sakta/sakti hoon" jese phrases kam use karein
5. Roman Urdu aur English ka natural mix use karein
6. "Main har step mein guide karungi" jese phrases avoid karo
7. Human jese aur quick response dein — long paragraphs na dein`;
      }
    }

    const promptContent = getLanguageAdjustedInstructions(tone);

    const firstMessageGuide = isFirstMessage
      ? `Pehla message examples:
- "Hello! Aapko kis tarah ki help chahiye?"
- "Hi! Bataiye aapko kia help chahiye?"`
      : "Conversation ko natural aur short rakhein. Har response unique ho.";

    const shouldShowPrice =
      gigDetails.pricing &&
      !isNaN(Number(gigDetails.pricing)) &&
      Number(gigDetails.pricing) > 0;

    return `${promptContent}
SERVICE DETAILS:
${gigDetails.description}
${shouldShowPrice ? `Price: Rs ${gigDetails.pricing} (complete package)` : ""}
${firstMessageGuide}`;
  }

  private async generateCustomOfferIntro(
    gigDetails: Partial<PlanCreationTypes>,
    gender: string
  ): Promise<string> {
    try {
      const style = gender.toLowerCase() === "female" ? "muhtarma" : "sahab";
      const prompt = `Tum ek professional ${style} ho aur yeh custom offer likhna hai:
- Service: ${gigDetails.title}
- Price: Rs ${gigDetails.pricing} (complete package)
- Maximum 2 sentences
- Professional aur respectful tone maintain karo, as a ${style}`;

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions ",
        {
          model: "gpt-3.5-turbo-0125",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.5,
          max_tokens: 70,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data.choices[0]?.message?.content?.trim() ?? "";
    } catch (error) {
      console.error("Error generating custom offer:", error);
      return "";
    }
  }

  private isResponseRepeating(newResponse: string): boolean {
    if (!lastResponse) return false;
    const commonPhrases = [
      "madad kar sakta",
      "madad kar sakti",
      "kia me app ki madad",
      "help kar sakta",
      "help kar sakti",
    ];
    const containsCommonPhrase = commonPhrases.some((phrase) =>
      newResponse.toLowerCase().includes(phrase)
    );
    return (
      containsCommonPhrase &&
      lastResponse.split(" ").length > 5 &&
      newResponse.split(" ").length > 5 &&
      this.calculateSimilarity(lastResponse, newResponse) > 0.7
    );
  }

  private calculateSimilarity(a: string, b: string): number {
    const wordsA = a.toLowerCase().split(" ");
    const wordsB = b.toLowerCase().split(" ");
    const setA = new Set(wordsA);
    const setB = new Set(wordsB);
    const intersection = new Set([...setA].filter((x) => setB.has(x)));
    return intersection.size / Math.max(wordsA.length, wordsB.length);
  }

  private calculateTemperature(): number {
    return responseCount < 3 ? 0.7 : 0.5;
  }

  private async handleRepetition(
    messages: any[],
    repeatedResponse: string
  ): Promise<string> {
    try {
      const retryMessages = [
        ...messages,
        {
          role: "system",
          content:
            "Pichli response repeat ho rahi hai. Naye tareeqe se service details bataein",
        },
      ];

      console.log("Repeated Response: ", repeatedResponse);

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions ",
        {
          model: "gpt-3.5-turbo-0125",
          messages: retryMessages,
          temperature: 0.7,
          max_tokens: 400,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const newResponse =
        response.data.choices[0]?.message?.content?.trim() ??
        "Chaliye main isko doosre andaaz mein samjhaun...";

      lastResponse = newResponse;
      responseCount++;
      return newResponse;
    } catch (error) {
      console.error("Error handling repetition:", error);
      return "Chaliye main isko doosre andaaz mein samjhaun...";
    }
  }

  private updateConversationState(response: string): void {
    lastResponse = response;
    responseCount++;
  }

  private async breakResponseWithAi(
    originalResponse: string
  ): Promise<string[]> {
    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions ",
        {
          model: "gpt-3.5-turbo-0125",
          messages: [
            {
              role: "system",
              content: `Break the following message into shorter, natural sentences (1–2 lines max). Keep the context and tone exactly the same. Do NOT add dashes, bullets, numbering, or any symbols. Just return plain sentences, one per line.\nMessage: "${originalResponse}"`,
            },
          ],
          temperature: 0.4,
          max_tokens: 300,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const aiResponse = response.data.choices[0]?.message?.content ?? "";
      return aiResponse
        .split("\n")
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0);
    } catch (error) {
      console.error("Split AI Error:", error);
      return [originalResponse];
    }
  }

  private async summarizePreviousMessages(
    messages: ChatMessageHistory[]
  ): Promise<string> {
    try {
      const content = messages
        .map(
          (m) =>
            `${m.senderId === "user" ? "User: " : "Assistant: "}${m.content}`
        )
        .join("\n");

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions ",
        {
          model: "gpt-3.5-turbo-0125",
          messages: [
            {
              role: "system",
              content: `Summarize the following conversation in 1-2 sentences in Roman Urdu:\n${content}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 100,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data.choices[0]?.message?.content?.trim() ?? "";
    } catch (error) {
      console.error("Error summarizing messages:", error);
      return "";
    }
  }
}

export default ChatbotService;
