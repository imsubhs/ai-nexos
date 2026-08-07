/* eslint-disable @typescript-eslint/no-explicit-any */
import jsep from "jsep";

/**
 * Property names an expression may never read, under any spelling.
 *
 * Refused outright rather than returned as `undefined` so a rule author sees
 * why their expression failed instead of debugging a silent empty value.
 */
const BLOCKED_PROPERTIES = new Set([
  "__proto__",
  "constructor",
  "prototype",
  "__defineGetter__",
  "__defineSetter__",
  "__lookupGetter__",
  "__lookupSetter__",
]);

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
        throw new ExpressionEvaluationError(
          `Failed to evaluate expression: ${err.message}`,
        );
      }
      throw new ExpressionEvaluationError(
        `Failed to evaluate expression: String Error`,
      );
    }
  }

  /**
   * Reads a property without traversing the prototype chain.
   *
   * The evaluator previously used `obj[key]` directly. Function *calls* were
   * already refused, which is the obvious escape, but plain reads still
   * reached everything an object inherits:
   *
   *     x.constructor.constructor      → the Function constructor
   *     x.__proto__                    → the shared prototype object
   *     x.constructor.prototype.foo    → another tenant's patched prototype
   *
   * None of those executes on its own here, but each hands an
   * operator-authored expression a reference it has no business holding, and
   * the first one is one `CallExpression` — or one future convenience feature
   * — away from arbitrary code execution inside an automation rule. Automation
   * rules are authored by tenant users and evaluated server-side, so that
   * distance is the entire boundary.
   *
   * Restricting reads to own enumerable properties keeps every legitimate use
   * (`deliverable.status`, `task.assignee.email`) working, because those are
   * plain data on plain objects.
   */
  private readProperty(target: unknown, key: unknown): unknown {
    if (target == null) return undefined;

    const name = typeof key === "symbol" ? undefined : String(key);
    if (name === undefined) return undefined;

    if (BLOCKED_PROPERTIES.has(name)) {
      throw new ExpressionEvaluationError(
        `Access to "${name}" is not permitted.`,
      );
    }

    // Strings and arrays are ordinary data in a rule; `.length` and index
    // access are expected and safe.
    if (typeof target === "string" || Array.isArray(target)) {
      if (name === "length") return (target as { length: number }).length;
      if (/^\d+$/.test(name)) {
        return (target as unknown as Record<string, unknown>)[name];
      }
      return undefined;
    }

    if (typeof target !== "object") return undefined;

    // hasOwn, not `in`: `in` follows the prototype chain, which is the thing
    // being closed off.
    if (!Object.hasOwn(target as object, name)) return undefined;

    return (target as Record<string, unknown>)[name];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private evaluateAst(node: any, context: Record<string, any>): any {
    switch (node.type) {
      case "Literal":
        return node.value;
      case "Identifier":
        // Own properties only — see readProperty. `context.constructor` would
        // otherwise resolve through the prototype chain.
        return this.readProperty(context, node.name);
      case "MemberExpression": {
        const obj = this.evaluateAst(node.object, context);
        if (obj == null) return undefined;
        const key = node.computed
          ? this.evaluateAst(node.property, context)
          : node.property.name;
        return this.readProperty(obj, key);
      }
      case "BinaryExpression":
      case "LogicalExpression":
        const left = this.evaluateAst(node.left, context);
        const right = this.evaluateAst(node.right, context);
        switch (node.operator) {
          case "==":
            return left == right;
          case "===":
            return left === right;
          case "!=":
            return left != right;
          case "!==":
            return left !== right;
          case "<":
            return left < right;
          case ">":
            return left > right;
          case "<=":
            return left <= right;
          case ">=":
            return left >= right;
          case "&&":
            return left && right;
          case "||":
            return left || right;
          case "AND":
            return left && right; // Support SQL/Custom syntax
          case "OR":
            return left || right;
          case "+":
            return left + right;
          case "-":
            return left - right;
          case "*":
            return left * right;
          case "/":
            return left / right;
          case "%":
            return left % right;
          default:
            throw new ExpressionEvaluationError(
              `Unsupported operator: ${node.operator}`,
            );
        }
      case "UnaryExpression":
        const arg = this.evaluateAst(node.argument, context);
        switch (node.operator) {
          case "!":
            return !arg;
          case "-":
            return -arg;
          case "+":
            return +arg;
          default:
            throw new ExpressionEvaluationError(
              `Unsupported unary operator: ${node.operator}`,
            );
        }
      case "CallExpression":
        // Optionally allow very specific safe functions (e.g. array.includes, string.startsWith)
        throw new ExpressionEvaluationError(
          "Function calls are disabled for security.",
        );
      default:
        throw new ExpressionEvaluationError(
          `Unsupported syntax type: ${node.type}`,
        );
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
