/**
 * Abstraction for token counting to prevent over/under-estimating Context Budget constraints.
 * In production, this should wrap a library like `tiktoken` (for OpenAI) or provider-specific tokenizers.
 */
export class Tokenizer {
  /**
   * Approximates token count using a deterministic rule (e.g., 4 characters = 1 token).
   * For production, swap this with `tiktoken` or a native provider tokenizer.
   */
  static countTokens(text: string): number {
    if (!text) return 0;
    // Fast estimation: roughly 4 chars per token for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Trims text to exactly fit a max token boundary, ensuring we don't slice mid-word.
   */
  static trimToTokens(text: string, maxTokens: number): string {
    if (!text) return "";
    const currentTokens = this.countTokens(text);
    if (currentTokens <= maxTokens) return text;

    // Approximate the char limit, minus a safety buffer
    const maxChars = Math.floor(maxTokens * 3.8);
    let trimmed = text.substring(0, maxChars);

    // Ensure we don't cut off mid-word
    const lastSpace = trimmed.lastIndexOf(" ");
    if (lastSpace > 0) {
      trimmed = trimmed.substring(0, lastSpace);
    }

    return trimmed + "...\n[Content Trimmed to fit Context Window]";
  }
}
