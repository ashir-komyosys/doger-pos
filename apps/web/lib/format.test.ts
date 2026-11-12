import assert from "node:assert/strict";
import test from "node:test";
import { formatCurrency, setDefaultCurrency } from "./format.ts";

test("formats the default currency as Pakistani rupees", () => {
  assert.equal(formatCurrency(1234.5), "Rs. 1,234.50");
});

test("formats PKR without the rupee glyph", () => {
  assert.equal(formatCurrency(1234.5, "PKR"), "Rs. 1,234.50");
});

test("keeps explicitly selected currencies", () => {
  assert.equal(formatCurrency(1234.5, "INR"), "Rs. 1,234.50");
});

test("uses the active restaurant currency when none is passed", () => {
  setDefaultCurrency("INR");
  assert.equal(formatCurrency(1234.5), "Rs. 1,234.50");
  setDefaultCurrency("PKR");
  assert.equal(formatCurrency(1234.5), "Rs. 1,234.50");
});
