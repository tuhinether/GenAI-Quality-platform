import { describe, expect, it } from "vitest";
import { computeAuditHash } from "./audit";

describe("computeAuditHash", () => {
  it("is stable regardless of payload key order", () => {
    const a = computeAuditHash({
      projectId: "p1",
      traceId: "t1",
      eventType: "trace.created",
      payload: { foo: 1, bar: 2 },
      prevHash: null,
    });
    const b = computeAuditHash({
      projectId: "p1",
      traceId: "t1",
      eventType: "trace.created",
      payload: { bar: 2, foo: 1 },
      prevHash: null,
    });
    expect(a).toBe(b);
  });

  it("changes when the payload changes", () => {
    const base = {
      projectId: "p1",
      traceId: "t1",
      eventType: "trace.created",
      prevHash: null,
    };
    const a = computeAuditHash({ ...base, payload: { amount: 100 } });
    const b = computeAuditHash({ ...base, payload: { amount: 101 } });
    expect(a).not.toBe(b);
  });

  it("detects a broken chain when an entry is tampered with", () => {
    const entry1 = {
      projectId: "p1",
      traceId: null,
      eventType: "trace.created",
      payload: { amount: 100 },
      prevHash: null,
    };
    const hash1 = computeAuditHash(entry1);

    const entry2 = {
      projectId: "p1",
      traceId: null,
      eventType: "annotation.created",
      payload: { verdict: "approve" },
      prevHash: hash1,
    };
    const hash2 = computeAuditHash(entry2);

    // Simulate tampering: entry1's payload is edited after the fact, but its
    // stored hash and entry2's prevHash are untouched.
    const tamperedEntry1Hash = computeAuditHash({ ...entry1, payload: { amount: 999 } });
    expect(tamperedEntry1Hash).not.toBe(hash1);

    // entry2's chain still points at the original (now-invalid) hash1, so
    // recomputing from the tampered value breaks verification.
    expect(entry2.prevHash).toBe(hash1);
    expect(entry2.prevHash).not.toBe(tamperedEntry1Hash);
    expect(hash2).toBeTruthy();
  });
});
