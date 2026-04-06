import { GeminiProvider } from './gemini';
import { GroqProvider } from './groq';

export type { GenerateTextOptions } from './gemini';
export { GeminiProvider } from './gemini';
export { GroqProvider } from './groq';

export interface AIProviderConfig {
  geminiKey?: string;
  groqKey?: string;
}

/**
 * Unified AI provider with automatic fallback.
 * Tries Gemini first; falls back to Groq on failure.
 */
export class AIProvider {
  private gemini: GeminiProvider | null;
  private groq: GroqProvider | null;

  constructor(config: AIProviderConfig) {
    this.gemini = config.geminiKey
      ? new GeminiProvider(config.geminiKey)
      : null;
    this.groq = config.groqKey ? new GroqProvider(config.groqKey) : null;

    if (!this.gemini && !this.groq) {
      throw new Error(
        'AIProvider requires at least one API key (geminiKey or groqKey)',
      );
    }
  }

  private get primary(): GeminiProvider | GroqProvider {
    return (this.gemini ?? this.groq)!;
  }

  private get fallback(): GroqProvider | GeminiProvider | null {
    if (this.gemini && this.groq) {
      return this.groq;
    }
    return null;
  }

  private async withFallback<T>(
    fn: (provider: GeminiProvider | GroqProvider) => Promise<T>,
  ): Promise<T> {
    try {
      return await fn(this.primary);
    } catch (primaryError: unknown) {
      if (this.fallback) {
        console.warn(
          `[AIProvider] Primary provider failed, falling back:`,
          primaryError instanceof Error
            ? primaryError.message
            : String(primaryError),
        );
        return await fn(this.fallback);
      }
      throw primaryError;
    }
  }

  async generateText(
    prompt: string,
    options?: { temperature?: number; maxTokens?: number; topP?: number; systemPrompt?: string },
  ): Promise<string> {
    return this.withFallback((provider) =>
      provider.generateText(prompt, options),
    );
  }

  async categorizeExpense(
    description: string,
    categories: Array<{ id: string; name: string }>,
  ): Promise<string> {
    return this.withFallback((provider) =>
      provider.categorizeExpense(description, categories),
    );
  }

  async generateInsight(context: string, question: string): Promise<string> {
    return this.withFallback((provider) =>
      provider.generateInsight(context, question),
    );
  }

  async generateAlert(anomalyData: string): Promise<string> {
    return this.withFallback((provider) =>
      provider.generateAlert(anomalyData),
    );
  }

  async generateForecastNarrative(forecastData: string): Promise<string> {
    return this.withFallback((provider) =>
      provider.generateForecastNarrative(forecastData),
    );
  }
}

let _instance: AIProvider | null = null;

/**
 * Get or create the singleton AIProvider instance.
 * On first call, reads keys from environment variables:
 *   GEMINI_API_KEY, GROQ_API_KEY
 */
export function getAIProvider(config?: AIProviderConfig): AIProvider {
  if (!_instance) {
    const resolved: AIProviderConfig = config ?? {
      geminiKey: process.env.GEMINI_API_KEY,
      groqKey: process.env.GROQ_API_KEY,
    };
    _instance = new AIProvider(resolved);
  }
  return _instance;
}

/**
 * Reset the singleton (useful for testing or reconfiguration).
 */
export function resetAIProvider(): void {
  _instance = null;
}
