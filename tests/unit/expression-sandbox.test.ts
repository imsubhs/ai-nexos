import { describe, expect, it } from "vitest";
import {
  ExpressionEvaluationError,
  RestrictedExpressionEngine,
} from "@/lib/automation/expressions";

const engine = new RestrictedExpressionEngine();

describe("expression sandbox — legitimate use", () => {
  it("evaluates comparisons against context data", () => {
    expect(
      engine.evaluate("status == 'approved'", { status: "approved" }),
    ).toBe(true);
    expect(engine.evaluate("amount > 100", { amount: 250 })).toBe(true);
    expect(engine.evaluate("amount > 100", { amount: 50 })).toBe(false);
  });

  it("reads nested own properties", () => {
    const context = { task: { assignee: { email: "a@example.com" } } };
    expect(
      engine.evaluate("task.assignee.email == 'a@example.com'", context),
    ).toBe(true);
  });

  it("supports string length and array indexing", () => {
    expect(engine.evaluate("name.length > 3", { name: "hello" })).toBe(true);
    expect(engine.evaluate("tags[0] == 'urgent'", { tags: ["urgent"] })).toBe(
      true,
    );
  });

  it("combines conditions", () => {
    const context = { status: "open", priority: 3 };
    expect(engine.evaluate("status == 'open' && priority >= 3", context)).toBe(
      true,
    );
  });

  it("returns undefined for a property that is simply absent", () => {
    expect(engine.evaluate("missing", {})).toBeUndefined();
  });
});

describe("expression sandbox — prototype access", () => {
  // Automation rules are authored by tenant users and evaluated server-side.
  // Function calls were already refused, but plain reads reached everything an
  // object inherits — and `constructor.constructor` is the Function
  // constructor, one feature away from arbitrary code execution.
  it.each([
    "x.constructor",
    "x.__proto__",
    "x.constructor.constructor",
    "x['constructor']",
    "x['__proto__']",
    "x.constructor.prototype",
    "x.__defineGetter__",
  ])("refuses %s", (expression) => {
    expect(() => engine.evaluate(expression, { x: { a: 1 } })).toThrow(
      ExpressionEvaluationError,
    );
  });

  it("refuses prototype access on the context object itself", () => {
    expect(() => engine.evaluate("constructor", {})).toThrow(
      ExpressionEvaluationError,
    );
  });

  it("does not reach inherited properties", () => {
    const parent = { inherited: "secret" };
    const child = Object.create(parent) as Record<string, unknown>;
    child.own = "visible";

    expect(engine.evaluate("x.own", { x: child })).toBe("visible");
    // `in` would find this; Object.hasOwn does not, which is the point.
    expect(engine.evaluate("x.inherited", { x: child })).toBeUndefined();
  });

  it("does not expose object methods as values", () => {
    expect(engine.evaluate("x.toString", { x: { a: 1 } })).toBeUndefined();
    expect(
      engine.evaluate("x.hasOwnProperty", { x: { a: 1 } }),
    ).toBeUndefined();
  });

  it("still refuses function calls", () => {
    expect(() => engine.evaluate("doThing()", {})).toThrow(
      ExpressionEvaluationError,
    );
  });

  it("refuses syntax it does not model, rather than guessing", () => {
    expect(() => engine.evaluate("x ? 1 : 2", { x: true })).toThrow(
      ExpressionEvaluationError,
    );
  });

  it("cannot pollute Object.prototype through evaluation", () => {
    expect(() => engine.evaluate("x.__proto__.polluted", { x: {} })).toThrow(
      ExpressionEvaluationError,
    );
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
