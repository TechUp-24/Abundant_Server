"use strict";
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
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const gonest_1 = require("gonest");
dotenv_1.default.config();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
let lastResponse = null;
let responseCount = 0;
class ChatbotService {
    get(message_1, previousMessages_1, gigDetails_1) {
        return __awaiter(this, arguments, void 0, function* (message, previousMessages, gigDetails, gender = "female") {
            var _a, _b, _c, _d;
            if (!message || typeof message !== "string") {
                throw new gonest_1.HttpVersionNotSupportedException("Missing or invalid message");
            }
            console.log("API KEY", OPENAI_API_KEY);
            if (!OPENAI_API_KEY) {
                throw new gonest_1.HttpVersionNotSupportedException("OpenAI API key not configured");
            }
            const userId = gigDetails.userId; // Replace with real user ID from context if needed
            try {
                // 1. Simple Greeting Check
                if (this.isSimpleGreeting(message)) {
                    const greetingResponse = this.getGreetingResponse(message);
                    return { reply: greetingResponse };
                }
                // 2. Detect User Tone
                const detectedTone = yield this.detectUserTone(message);
                // 3. Detect Buying Interest
                const isInterested = yield this.detectBuyingInterest(message);
                const isFirstMessage = previousMessages.length === 0;
                // 4. Check if used service name too often
                const usedServiceTooOften = this.usedServiceNameTooOften(previousMessages, gigDetails.title || "");
                // 5. Check if asking for missing gig info
                const isAskingMissing = yield this.isAskingForMissingGigInfo(message, gigDetails);
                // Build complete message stack
                const messages = yield this.buildCompleteMessageStack(previousMessages, message, gigDetails, isFirstMessage, gender, detectedTone, usedServiceTooOften, isAskingMissing, isInterested);
                // Get AI response
                const response = yield axios_1.default.post("https://api.openai.com/v1/chat/completions ", {
                    model: "gpt-3.5-turbo-0125",
                    messages,
                    temperature: this.calculateTemperature(),
                    top_p: 0.9,
                    frequency_penalty: 0.5,
                    presence_penalty: 0.5,
                    max_tokens: 350,
                    user: userId,
                }, {
                    headers: {
                        Authorization: `Bearer ${OPENAI_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                });
                let reply = (_d = (_c = (_b = (_a = response.data.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.trim()) !== null && _d !== void 0 ? _d : "Mujhe samajhne mein thori takleef hui. Zara dobara bata sakte hain?";
                // 6. Sanitize AI Response
                reply = this.sanitizeAiResponse(reply);
                // Check for repeating responses
                if (this.isResponseRepeating(reply)) {
                    reply = yield this.handleRepetition(messages, reply);
                }
                // Update conversation state
                this.updateConversationState(reply);
                // Break response into parts
                const brokenParts = yield this.breakResponseWithAi(reply);
                const finalReply = brokenParts.join("\n");
                return { reply: finalReply };
                ;
            }
            catch (error) {
                console.error("OpenAI error:", error);
                throw new Error("Maaf kijiye, technical masla ho gaya.");
            }
        });
    }
    isSimpleGreeting(message) {
        const lowerMessage = message.trim().toLowerCase();
        const exactGreetings = ["hi", "hello", "hey", "haan", "yes"];
        const patternGreetings = [/hi\s+there/i, /hello\s+there/i, /^hey\W*$/i];
        return (exactGreetings.includes(lowerMessage) ||
            patternGreetings.some((pattern) => pattern.test(lowerMessage)));
    }
    getGreetingResponse(userMessage) {
        const lowerMessage = userMessage.trim().toLowerCase();
        const greetingsMap = {
            hi: "Hi",
            hello: "Hello",
            hey: "Hey",
            haan: "Haan",
            yes: "Yes",
        };
        const patternGreetings = {
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
        const selectedResponse = simpleResponses[Math.floor(Math.random() * simpleResponses.length)];
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
    detectUserTone(message) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const response = yield axios_1.default.post("https://api.openai.com/v1/chat/completions ", {
                    model: "gpt-3.5-turbo-0125",
                    messages: [
                        {
                            role: "system",
                            content: "You are a tone detector. The user will send a message. Your job is to return one word ONLY from: 'urdu', 'english', or 'mix' based on the tone and language style of the message. No explanation, just the word.",
                        },
                        {
                            role: "user",
                            content: message,
                        },
                    ],
                    temperature: 0.2,
                    max_tokens: 10,
                }, {
                    headers: {
                        Authorization: `Bearer ${OPENAI_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                });
                return (((_c = (_b = (_a = response.data.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.trim().toLowerCase()) ||
                    "mix");
            }
            catch (error) {
                console.error("Error detecting tone:", error);
                return "mix";
            }
        });
    }
    detectBuyingInterest(message) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                const response = yield axios_1.default.post("https://api.openai.com/v1/chat/completions ", {
                    model: "gpt-3.5-turbo-0125",
                    messages: [
                        {
                            role: "system",
                            content: "User ne service mein interest dikhaya hai? Sirf 'han' ya 'nahi' mein jawab dein.",
                        },
                        {
                            role: "user",
                            content: message,
                        },
                    ],
                    temperature: 0,
                    max_tokens: 3,
                }, {
                    headers: {
                        Authorization: `Bearer ${OPENAI_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                });
                const answer = (_d = (_c = (_b = (_a = response.data.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.toLowerCase()) !== null && _d !== void 0 ? _d : "";
                return answer.includes("han") || answer.includes("yes");
            }
            catch (error) {
                console.error("Error detecting buying interest:", error);
                return false;
            }
        });
    }
    usedServiceNameTooOften(messages, serviceTitle) {
        var _a, _b;
        let count = 0;
        for (const msg of messages) {
            const content = (_b = (_a = msg.content) === null || _a === void 0 ? void 0 : _a.toLowerCase()) !== null && _b !== void 0 ? _b : "";
            if (content.includes(serviceTitle.toLowerCase())) {
                count++;
            }
        }
        return count > 2;
    }
    sanitizeAiResponse(message) {
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
    isAskingForMissingGigInfo(userMessage, gigDetails) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                const response = yield axios_1.default.post("https://api.openai.com/v1/chat/completions ", {
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
                }, {
                    headers: {
                        Authorization: `Bearer ${OPENAI_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                });
                const answer = (_d = (_c = (_b = (_a = response.data.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.toLowerCase()) !== null && _d !== void 0 ? _d : "";
                return answer.includes("han") || answer.includes("yes");
            }
            catch (error) {
                console.error("Error checking missing gig info:", error);
                return false;
            }
        });
    }
    buildCompleteMessageStack(previousMessages, userMessage, gigDetails, isFirstMessage, gender, tone, usedServiceTooOften, isAskingMissing, isInterested) {
        return __awaiter(this, void 0, void 0, function* () {
            const messages = [];
            messages.push({
                role: "system",
                content: this.createSystemPrompt(gigDetails, isFirstMessage, gender, tone),
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
                const summary = yield this.summarizePreviousMessages(previousMessages);
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
                    content: "Aap bar bar service ka naam use kar rahe hain. Kripya sirf jab zarurat ho tab mention karein.",
                });
            }
            messages.push({
                role: "user",
                content: userMessage,
            });
            if (isAskingMissing && !isFirstMessage) {
                const generatedInfo = yield this.generateMissingGigInfoReply(userMessage, gigDetails);
                messages.push({
                    role: "system",
                    content: `User ne aisi baat poochhi hai jo gig mein nahi thi. Yeh ek short response dein:\n${generatedInfo}`,
                });
            }
            if (isInterested) {
                const customOfferMessage = yield this.generateCustomOfferIntro(gigDetails, gender);
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
                content: 'Service ka naam sirf zaroorat par hi mention karein. Normally "yeh service" use karein.',
            });
            return messages;
        });
    }
    generateMissingGigInfoReply(userMessage, gigDetails) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            try {
                const description = (_b = (_a = gigDetails.description) === null || _a === void 0 ? void 0 : _a.toString().trim()) !== null && _b !== void 0 ? _b : "";
                const prompt = `User ne yeh message likha: "${userMessage}"
Gig ka description yeh hai:
"${description}"
Sirf usi cheez ka jawab dein jo user ke sawal se directly related ho *aur* gig ke description mein nahi hai. 
Kisi irrelevant topic, generic advice, ya extra offer ka zikar na karein.
Professional aur friendly style mein sirf 1-2 lines mein jawab dein — Roman Urdu + English mix mein.
Agar kuch bhi clear nahi hai, to politely kahe: "Yeh cheez shayad gig mein nahi covered, thoda clarify karen please?"`;
                const response = yield axios_1.default.post("https://api.openai.com/v1/chat/completions ", {
                    model: "gpt-3.5-turbo-0125",
                    messages: [
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
                    temperature: 0.65,
                    max_tokens: 120,
                }, {
                    headers: {
                        Authorization: `Bearer ${OPENAI_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                });
                return ((_f = (_e = (_d = (_c = response.data.choices[0]) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.content) === null || _e === void 0 ? void 0 : _e.trim()) !== null && _f !== void 0 ? _f : "Aap ka sawal gig description se related nahi lagta. Thoda aur clearly batayein?");
            }
            catch (error) {
                console.error("Error generating missing gig info reply:", error);
                return "Aap ka sawal gig description se related nahi lagta. Thoda aur clearly batayein?";
            }
        });
    }
    createSystemPrompt(gigDetails, isFirstMessage, gender, tone) {
        const style = gender.toLowerCase() === "female" ? "muhtarma" : "sahab";
        function getLanguageAdjustedInstructions(tone) {
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
        const shouldShowPrice = gigDetails.pricing &&
            !isNaN(Number(gigDetails.pricing)) &&
            Number(gigDetails.pricing) > 0;
        return `${promptContent}
SERVICE DETAILS:
${gigDetails.description}
${shouldShowPrice ? `Price: Rs ${gigDetails.pricing} (complete package)` : ""}
${firstMessageGuide}`;
    }
    generateCustomOfferIntro(gigDetails, gender) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                const style = gender.toLowerCase() === "female" ? "muhtarma" : "sahab";
                const prompt = `Tum ek professional ${style} ho aur yeh custom offer likhna hai:
- Service: ${gigDetails.title}
- Price: Rs ${gigDetails.pricing} (complete package)
- Maximum 2 sentences
- Professional aur respectful tone maintain karo, as a ${style}`;
                const response = yield axios_1.default.post("https://api.openai.com/v1/chat/completions ", {
                    model: "gpt-3.5-turbo-0125",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.5,
                    max_tokens: 70,
                }, {
                    headers: {
                        Authorization: `Bearer ${OPENAI_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                });
                return (_d = (_c = (_b = (_a = response.data.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.trim()) !== null && _d !== void 0 ? _d : "";
            }
            catch (error) {
                console.error("Error generating custom offer:", error);
                return "";
            }
        });
    }
    isResponseRepeating(newResponse) {
        if (!lastResponse)
            return false;
        const commonPhrases = [
            "madad kar sakta",
            "madad kar sakti",
            "kia me app ki madad",
            "help kar sakta",
            "help kar sakti",
        ];
        const containsCommonPhrase = commonPhrases.some((phrase) => newResponse.toLowerCase().includes(phrase));
        return (containsCommonPhrase &&
            lastResponse.split(" ").length > 5 &&
            newResponse.split(" ").length > 5 &&
            this.calculateSimilarity(lastResponse, newResponse) > 0.7);
    }
    calculateSimilarity(a, b) {
        const wordsA = a.toLowerCase().split(" ");
        const wordsB = b.toLowerCase().split(" ");
        const setA = new Set(wordsA);
        const setB = new Set(wordsB);
        const intersection = new Set([...setA].filter((x) => setB.has(x)));
        return intersection.size / Math.max(wordsA.length, wordsB.length);
    }
    calculateTemperature() {
        return responseCount < 3 ? 0.7 : 0.5;
    }
    handleRepetition(messages, repeatedResponse) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                const retryMessages = [
                    ...messages,
                    {
                        role: "system",
                        content: "Pichli response repeat ho rahi hai. Naye tareeqe se service details bataein",
                    },
                ];
                console.log("Repeated Response: ", repeatedResponse);
                const response = yield axios_1.default.post("https://api.openai.com/v1/chat/completions ", {
                    model: "gpt-3.5-turbo-0125",
                    messages: retryMessages,
                    temperature: 0.7,
                    max_tokens: 400,
                }, {
                    headers: {
                        Authorization: `Bearer ${OPENAI_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                });
                const newResponse = (_d = (_c = (_b = (_a = response.data.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.trim()) !== null && _d !== void 0 ? _d : "Chaliye main isko doosre andaaz mein samjhaun...";
                lastResponse = newResponse;
                responseCount++;
                return newResponse;
            }
            catch (error) {
                console.error("Error handling repetition:", error);
                return "Chaliye main isko doosre andaaz mein samjhaun...";
            }
        });
    }
    updateConversationState(response) {
        lastResponse = response;
        responseCount++;
    }
    breakResponseWithAi(originalResponse) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const response = yield axios_1.default.post("https://api.openai.com/v1/chat/completions ", {
                    model: "gpt-3.5-turbo-0125",
                    messages: [
                        {
                            role: "system",
                            content: `Break the following message into shorter, natural sentences (1–2 lines max). Keep the context and tone exactly the same. Do NOT add dashes, bullets, numbering, or any symbols. Just return plain sentences, one per line.\nMessage: "${originalResponse}"`,
                        },
                    ],
                    temperature: 0.4,
                    max_tokens: 300,
                }, {
                    headers: {
                        Authorization: `Bearer ${OPENAI_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                });
                const aiResponse = (_c = (_b = (_a = response.data.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) !== null && _c !== void 0 ? _c : "";
                return aiResponse
                    .split("\n")
                    .map((line) => line.trim())
                    .filter((line) => line.length > 0);
            }
            catch (error) {
                console.error("Split AI Error:", error);
                return [originalResponse];
            }
        });
    }
    summarizePreviousMessages(messages) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                const content = messages
                    .map((m) => `${m.senderId === "user" ? "User: " : "Assistant: "}${m.content}`)
                    .join("\n");
                const response = yield axios_1.default.post("https://api.openai.com/v1/chat/completions ", {
                    model: "gpt-3.5-turbo-0125",
                    messages: [
                        {
                            role: "system",
                            content: `Summarize the following conversation in 1-2 sentences in Roman Urdu:\n${content}`,
                        },
                    ],
                    temperature: 0.3,
                    max_tokens: 100,
                }, {
                    headers: {
                        Authorization: `Bearer ${OPENAI_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                });
                return (_d = (_c = (_b = (_a = response.data.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.trim()) !== null && _d !== void 0 ? _d : "";
            }
            catch (error) {
                console.error("Error summarizing messages:", error);
                return "";
            }
        });
    }
}
exports.default = ChatbotService;
