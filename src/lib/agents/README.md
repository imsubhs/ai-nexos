# Module 19: AI Agents - Documentation

## Explainability Ledger vs Audit Logging

### Deprecation Notice: `ai_agent_audit`
The table `ai_agent_audit` has been officially **DEPRECATED** and removed from the active schema in Module 19.1. It is no longer supported for tracking agent behavior. 

### Replacement: `ai_agent_explainability_ledger`
Agent tracking is now exclusively handled by the **Explainability Ledger** (`ai_agent_explainability_ledger`). 

This change was made to enforce strict architectural constraints:
1. **No Chain-of-Thought**: We never persist raw, unstructured LLM reasoning (Chain-of-Thought) which can bloat storage and expose intermediate insecure logic.
2. **Structured References**: The Explainability Ledger strictly relies on relational references to:
   - `goal_reference`
   - `plan_version_reference` (immutable plan)
   - `context_reference` (immutable context snapshot used for the decision)
   - `tool_usage_reference`
   - `automation_reference` (Module 17 hook)
   - `approval_reference` (Module 09 human-in-the-loop)
3. **Outcome Summaries**: Only the final, validated outcome summary is stored as plain text.

### Implementation Guidelines
When implementing new executor logic or worker nodes:
- Do **not** log raw prompts or reasoning arrays.
- Always use `createImmutableContextSnapshot` to snapshot state, and link its ID to the ledger.
- Use `aiAgentCheckpointLedger` to persist the DAG execution state explicitly instead of relying on the Explainability Ledger to reconstruct the timeline.
