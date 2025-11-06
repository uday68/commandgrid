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
exports.AIService = void 0;
// src/services/aiService.ts
const openai_1 = __importDefault(require("openai"));
class AIService {
    constructor(apiKey) {
        this.cache = new Map();
        this.openai = new openai_1.default({
            apiKey: apiKey,
            organization: 'org-xyz' // Optional
        });
    }
    getSuggestions(project) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const cacheKey = `suggestions-${project.id}`;
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }
            try {
                const prompt = this.buildSuggestionPrompt(project);
                const response = yield this.openai.chat.completions.create({
                    model: 'gpt-4',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful project management assistant. Provide concise, actionable suggestions.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 150
                });
                const suggestions = this.parseSuggestions(((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '');
                this.cache.set(cacheKey, suggestions);
                return suggestions;
            }
            catch (error) {
                console.error('AI Service Error:', error);
                return [];
            }
        });
    }
    buildSuggestionPrompt(project) {
        return `Project: ${project.name} (${project.type})
Current Features: ${project.features.join(', ')}
Tasks: ${project.tasks.map(t => t.title).join(', ')}

Based on this information, suggest 5 important next steps for this project. Format each suggestion as a bullet point starting with "- ".`;
    }
    parseSuggestions(content) {
        return content
            .split('\n')
            .filter(line => line.startsWith('- '))
            .map(line => line.substring(2).trim());
    }
    analyzeDependencies(tasks) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementation for AI-powered dependency analysis
        });
    }
    estimateTaskComplexity(task) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementation for AI-powered complexity estimation
        });
    }
}
exports.AIService = AIService;
//# sourceMappingURL=aiServices.js.map