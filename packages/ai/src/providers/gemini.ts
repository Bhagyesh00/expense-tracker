import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';

export interface GenerateTextOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  systemPrompt?: string;
}

interface RateLimitState {
  timestamps: number[];
  maxPerMinute: number;
}

export class GeminiProvider {
  private model: GenerativeModel;
  private rateLimit: RateLimitState;
  private retryDelays = [1000, 2000, 4000, 8000];

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    this.rateLimit = { timestamps: [], maxPerMinute: 60 };
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    this.rateLimit.timestamps = this.rateLimit.timestamps.filter(
      (t) => now - t < 60_000,
    );

    if (this.rateLimit.timestamps.length >= this.rateLimit.maxPerMinute) {
      const oldest = this.rateLimit.timestamps[0]!;
      const waitMs = 60_000 - (now - oldest) + 100;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    this.rateLimit.timestamps.push(Date.now());
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.retryDelays.length; attempt++) {
      try {
        await this.waitForRateLimit();
        return await fn();
      } catch (error: unknown) {
        lastError = error;
        const isRetryable =
          error instanceof Error &&
          (error.message.includes('429') ||
            error.message.includes('503') ||
            error.message.includes('RESOURCE_EXHAUSTED') ||
            error.message.includes('UNAVAILABLE'));

        if (!isRetryable || attempt === this.retryDelays.length) {
          throw error;
        }

        const delay = this.retryDelays[attempt]!;
        const jitter = Math.random() * delay * 0.1;
        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
      }
    }

    throw lastError;
  }

  async generateText(
    prompt: string,
    options?: GenerateTextOptions,
  ): Promise<string> {
    return this.withRetry(async () => {
      const parts: string[] = [];
      if (options?.systemPrompt) {
        parts.push(options.systemPrompt + '\n\n');
      }
      parts.push(prompt);

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: parts.join('') }] }],
        generationConfig: {
          temperature: options?.temperature ?? 0.3,
          maxOutputTokens: options?.maxTokens ?? 1024,
          topP: options?.topP ?? 0.9,
        },
      });

      const response = result.response;
      const text = response.text();
      if (!text) {
        throw new Error('Gemini returned an empty response');
      }
      return text;
    });
  }

  async categorizeExpense(
    description: string,
    categories: Array<{ id: string; name: string }>,
  ): Promise<string> {
    const categoryList = categories
      .map((c) => `- id: "${c.id}", name: "${c.name}"`)
      .join('\n');

    const prompt = `You are an expense categorization assistant. Given an expense description, classify it into one of the provided categories.

Categories:
${categoryList}

Expense description: "${description}"

Respond with ONLY a JSON object in this exact format:
{"categoryId": "<id>", "confidence": <0.0-1.0>, "reasoning": "<brief explanation>"}`;

    return this.generateText(prompt, { temperature: 0.1 });
  }

  async generateInsight(context: string, question: string): Promise<string> {
    const prompt = `You are a personal finance insights assistant. Based on the user's financial data, answer their question concisely and helpfully.

Financial context:
${context}

User question: "${question}"

Provide a clear, actionable answer. Include specific numbers when relevant. Keep the response under 200 words.`;

    return this.generateText(prompt, { temperature: 0.4 });
  }

  async generateAlert(anomalyData: string): Promise<string> {
    const prompt = `You are a friendly financial alert assistant. Generate a brief, conversational alert message for the following spending anomaly.

Anomaly data:
${anomalyData}

Respond with ONLY a JSON object in this exact format:
{"title": "<short title>", "body": "<conversational message, 1-2 sentences>", "emoji": "<single relevant emoji>", "actionSuggestion": "<what the user can do>"}`;

    return this.generateText(prompt, { temperature: 0.5 });
  }

  async generateForecastNarrative(forecastData: string): Promise<string> {
    const prompt = `You are a personal finance assistant. Generate a brief narrative summary of the user's spending forecast for the rest of the month.

Forecast data:
${forecastData}

Write 2-3 conversational sentences. Mention the projected total, compare to budget if available, identify the biggest spending driver, and suggest one actionable tip. Use Indian Rupee (INR) formatting.`;

    return this.generateText(prompt, { temperature: 0.5 });
  }
}
