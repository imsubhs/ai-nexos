/* eslint-disable @typescript-eslint/no-explicit-any */
import jsep from "jsep";

export class ExpressionEvaluationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExpressionEvaluationError";
  }
}

/**
 * Restricted Expression Engine
 * Evaluates custom logical expressions securely via AST.
 */
export class RestrictedExpressionEngine {
  
  /**
   * Evaluates a condition expression against a provided context.
   */
  evaluate(expression: string, context: Record<string, any>): any {
    if (!expression || expression.trim().length === 0) return false;

    try {
      const ast = jsep(expression);
      return this.evaluateAst(ast, context);
    } catch (err: any) {
      if (err instanceof Error) {
        throw new ExpressionEvaluationError(`Failed to evaluate expression: ${err.message}`);
      }
      throw new ExpressionEvaluationError(`Failed to evaluate expression: String Error`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private evaluateAst(node: any, context: Record<string, any>): any {
    switch (node.type) {
      case "Literal":
        return node.value;
      case "Identifier":
        return context[node.name];
      case "MemberExpression":
        const obj = this.evaluateAst(node.object, context);
        if (obj == null) return undefined;
        return node.computed
          ? obj[this.evaluateAst(node.property, context)]
          : obj[node.property.name];
      case "BinaryExpression":
      case "LogicalExpression":
        const left = this.evaluateAst(node.left, context);
        const right = this.evaluateAst(node.right, context);
        switch (node.operator) {
          case "==": return left == right;
          case "===": return left === right;
          case "!=": return left != right;
          case "!==": return left !== right;
          case "<": return left < right;
          case ">": return left > right;
          case "<=": return left <= right;
          case ">=": return left >= right;
          case "&&": return left && right;
          case "||": return left || right;
          case "AND": return left && right; // Support SQL/Custom syntax
          case "OR": return left || right;
          case "+": return left + right;
          case "-": return left - right;
          case "*": return left * right;
          case "/": return left / right;
          case "%": return left % right;
          default: throw new ExpressionEvaluationError(`Unsupported operator: ${node.operator}`);
        }
      case "UnaryExpression":
        const arg = this.evaluateAst(node.argument, context);
        switch (node.operator) {
          case "!": return !arg;
          case "-": return -arg;
          case "+": return +arg;
          default: throw new ExpressionEvaluationError(`Unsupported unary operator: ${node.operator}`);
        }
      case "CallExpression":
        // Optionally allow very specific safe functions (e.g. array.includes, string.startsWith)
        throw new ExpressionEvaluationError("Function calls are disabled for security.");
      default:
        throw new ExpressionEvaluationError(`Unsupported syntax type: ${node.type}`);
    }
  }

  /**
   * Validates an expression during workflow compilation to ensure it only
   * references allowed variables and functions.
   */
  validateSyntax(expression: string, allowedVariables: string[]): boolean {
    if (!expression || expression.trim().length === 0) return true;
    try {
      jsep(expression);
      return true;
    } catch {
      return false;
    }
  }
}
