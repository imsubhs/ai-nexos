/* eslint-disable @typescript-eslint/no-explicit-any */
import { automationVariableTypeEnum } from "@/db/schema/enums";

export type VariableType = typeof automationVariableTypeEnum.enumValues[number];

export interface AutomationVariable {
  name: string;
  type: VariableType;
  valueRaw: string | null;
  isRequired: boolean;
}

export class VariableValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VariableValidationError";
  }
}

/**
 * Validates variables against their strongly typed definitions.
 */
export class VariableEngine {
  
  validate(variable: AutomationVariable, providedValue: any): any {
    if (providedValue == null) {
      if (variable.isRequired && variable.valueRaw == null) {
        throw new VariableValidationError(`Variable '${variable.name}' is required but no value was provided.`);
      }
      // Fallback to default if not provided
      providedValue = variable.valueRaw;
      if (providedValue == null) return null;
    }

    switch (variable.type) {
      case "string":
        if (typeof providedValue !== "string") {
          throw new VariableValidationError(`Variable '${variable.name}' expects a string.`);
        }
        return providedValue;

      case "number":
        const num = Number(providedValue);
        if (isNaN(num)) {
          throw new VariableValidationError(`Variable '${variable.name}' expects a number.`);
        }
        return num;

      case "boolean":
        if (typeof providedValue === "boolean") return providedValue;
        if (providedValue === "true") return true;
        if (providedValue === "false") return false;
        throw new VariableValidationError(`Variable '${variable.name}' expects a boolean.`);

      case "date":
        const date = new Date(providedValue);
        if (isNaN(date.getTime())) {
          throw new VariableValidationError(`Variable '${variable.name}' expects a valid ISO date string.`);
        }
        return date.toISOString();

      case "enum":
        // In a real implementation, we'd also have the allowed enum values configured per variable.
        if (typeof providedValue !== "string") {
          throw new VariableValidationError(`Variable '${variable.name}' expects an enum string.`);
        }
        return providedValue;

      case "json":
        if (typeof providedValue === "object") return providedValue;
        try {
          return JSON.parse(providedValue);
        } catch (e) {
          throw new VariableValidationError(`Variable '${variable.name}' expects valid JSON.`);
        }

      case "secret_reference":
        if (typeof providedValue !== "string" || !providedValue.startsWith("sec_")) {
          throw new VariableValidationError(`Variable '${variable.name}' expects a valid secret reference identifier.`);
        }
        return providedValue;

      default:
        throw new VariableValidationError(`Unknown variable type: ${variable.type}`);
    }
  }

  /**
   * Securely fetches secrets from a Vault and prevents them from being leaked in logs.
   */
  private async fetchSecretFromVault(secretId: string): Promise<SecretValue> {
    // Mock Vault fetch
    // In production, this would call AWS Secrets Manager, HashiCorp Vault, etc.
    return new SecretValue(`plaintext_secret_for_${secretId}`);
  }

  async resolveAll(variables: AutomationVariable[], contextValues: Record<string, any>): Promise<Record<string, any>> {
    const resolved: Record<string, any> = {};
    for (const variable of variables) {
      const providedValue = contextValues[variable.name];
      const validated = this.validate(variable, providedValue);
      
      if (variable.type === "secret_reference" && validated) {
        resolved[variable.name] = await this.fetchSecretFromVault(validated);
      } else {
        resolved[variable.name] = validated;
      }
    }
    return resolved;
  }
}

/**
 * A wrapper class for secret values that overrides toString and toJSON 
 * to prevent accidental exposure in execution logs.
 */
export class SecretValue {
  constructor(private readonly value: string) {}

  getPlaintext(): string {
    return this.value;
  }

  toString(): string {
    return "***REDACTED_SECRET***";
  }

  toJSON(): string {
    return "***REDACTED_SECRET***";
  }
}
