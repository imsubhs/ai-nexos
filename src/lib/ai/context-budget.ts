import type { ContextBudget, ContextItem } from "./types";
import { Tokenizer } from "./tokenizer";

export class ContextBudgetManager {
  /**
   * Evaluates and filters raw context items to fit within a given budget.
   * Ranks by relevance and trims the lowest priority items.
   */
  static applyBudget(items: ContextItem[], budget: ContextBudget): ContextItem[] {
    // Sort items primarily by source weight, then by relevance score
    const sortedItems = [...items].sort((a, b) => {
      const weightA = budget.priorityWeights[a.sourceType] || 1;
      const weightB = budget.priorityWeights[b.sourceType] || 1;
      
      const scoreA = weightA * a.relevanceScore;
      const scoreB = weightB * b.relevanceScore;

      return scoreB - scoreA; // Descending
    });

    const approvedItems: ContextItem[] = [];
    let tokensUsed = 0;

    for (const item of sortedItems) {
      if (tokensUsed + item.tokenCount <= budget.maxTokens) {
        approvedItems.push(item);
        tokensUsed += item.tokenCount;
      } else {
        // If an item exceeds the budget, attempt structured trimming instead of just dropping
        const remainingTokens = budget.maxTokens - tokensUsed;
        
        // We only trim if there's enough meaningful budget left (e.g. > 100 tokens)
        if (remainingTokens > 100) {
          const trimmedContent = Tokenizer.trimToTokens(item.content, remainingTokens);
          approvedItems.push({
            ...item,
            content: trimmedContent,
            tokenCount: remainingTokens
          });
          tokensUsed += remainingTokens;
        }
        
        break; // Budget is now completely full
      }
    }

    budget.remainingTokens = budget.maxTokens - tokensUsed;
    return approvedItems;
  }

  /**
   * Summarization Hook Placeholder.
   * In a live environment, if an item is critical (high relevance) but large, 
   * this would dispatch to a cheap fast model (e.g., Claude Haiku) to summarize it before injection.
   */
  static async compressContext(item: ContextItem): Promise<ContextItem> {
    // Current implementation: No-op for now. Structured trimming happens in applyBudget.
    // Real implementation would invoke LLM summarization.
    return item;
  }
}
