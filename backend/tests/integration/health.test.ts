import request from "supertest";
import { createApp } from "../../src/app.js";

describe("GET /api/health (smoke)", () => {
  it("responds with ok", async () => {
    const res = await request(createApp()).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

