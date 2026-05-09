import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Helper to create a mock authenticated context
function createAuthContext(role: "admin" | "user" = "admin"): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "email:claudiolx.nunes@gmail.com",
      email: "claudiolx.nunes@gmail.com",
      name: "Claudio Nunes",
      loginMethod: "email",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

describe("auth.me", () => {
  it("returns null for unauthenticated users", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user info for authenticated users", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.email).toBe("claudiolx.nunes@gmail.com");
    expect(result?.role).toBe("admin");
  });
});

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const clearedCookies: string[] = [];
    const ctx: TrpcContext = {
      user: {
        id: 1,
        openId: "email:test@test.com",
        email: "test@test.com",
        name: "Test User",
        loginMethod: "email",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string) => { clearedCookies.push(name); },
      } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(clearedCookies.length).toBeGreaterThan(0);
  });
});

describe("dashboard.kpis", () => {
  it("returns KPI data for authenticated users", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.dashboard.kpis();
    expect(result).toBeDefined();
    expect(typeof result.totalRepresentatives).toBe("number");
    expect(typeof result.totalActiveClients).toBe("number");
    expect(typeof result.totalOpportunities).toBe("number");
    expect(typeof result.pipelineValue).toBe("number");
    expect(result.totalRepresentatives).toBeGreaterThan(0);
    expect(result.totalActiveClients).toBeGreaterThan(0);
  });

  it("filters KPIs by regionId", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const allResult = await caller.dashboard.kpis();
    const spResult = await caller.dashboard.kpis({ regionId: 1 });
    // São Paulo should have fewer or equal clients than all regions
    expect(spResult.totalActiveClients).toBeLessThanOrEqual(allResult.totalActiveClients);
  });
});

describe("representatives.list", () => {
  it("returns list of representatives", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.representatives.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    // Check structure of first representative
    const rep = result[0];
    expect(rep).toHaveProperty("id");
    expect(rep).toHaveProperty("name");
    expect(rep).toHaveProperty("regionName"); // comes from join
    expect(rep).toHaveProperty("performanceScore");
  });

  it("filters representatives by region", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const allReps = await caller.representatives.list();
    // Filter by regionId (1 = São Paulo)
    const spReps = await caller.representatives.list({ regionId: 1 });
    expect(spReps.length).toBeLessThanOrEqual(allReps.length);
    spReps.forEach(rep => {
      // regionName comes from join
      expect(rep.regionName).toBe("São Paulo");
    });
  });
});

describe("clients.list", () => {
  it("returns list of clients", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.clients.list({ region: "all" });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    const client = result[0];
    expect(client).toHaveProperty("id");
    expect(client).toHaveProperty("name");
    expect(client).toHaveProperty("type");
    expect(["fazenda_ruminantes", "fabrica_racao"]).toContain(client.type);
  });
});

describe("opportunities.list", () => {
  it("returns pipeline opportunities", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.opportunities.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    const opp = result[0];
    expect(opp).toHaveProperty("id");
    expect(opp).toHaveProperty("title");
    expect(opp).toHaveProperty("stage");
    expect(opp).toHaveProperty("value");
    expect(["prospecting", "qualification", "proposal", "negotiation", "won", "lost"]).toContain(opp.stage);
  });
});

describe("goals.list", () => {
  it("returns goals list", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.goals.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    const goal = result[0];
    expect(goal).toHaveProperty("id");
    expect(goal).toHaveProperty("targetValue");
    expect(goal).toHaveProperty("currentValue");
    expect(goal).toHaveProperty("status");
    // regionName comes from join
    expect(goal).toHaveProperty("progressPercent");
  });
});

describe("activities.list", () => {
  it("returns activities list", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // activities.list takes optional input with type and representativeId
    const result = await caller.activities.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    const activity = result[0];
    expect(activity).toHaveProperty("id");
    expect(activity).toHaveProperty("type");
    expect(activity).toHaveProperty("status");
  });
});

describe("analytics.forecast", () => {
  it("returns analytics forecast data", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.analytics.forecast();
    expect(result).toBeDefined();
    expect(typeof result.forecast90Days).toBe("number");
    expect(typeof result.conversionRate).toBe("number");
    expect(typeof result.avgCycleDays).toBe("number");
    expect(typeof result.avgTicket).toBe("number");
    expect(result.forecast90Days).toBeGreaterThan(0);
    expect(Array.isArray(result.pipeline)).toBe(true);
  });
});

describe("automations.list", () => {
  it("returns automations list", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.automations.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    const automation = result[0];
    expect(automation).toHaveProperty("id");
    expect(automation).toHaveProperty("name");
    expect(automation).toHaveProperty("trigger");
    expect(automation).toHaveProperty("action");
    expect(automation).toHaveProperty("isActive");
  });
});

describe("notifications.list", () => {
  it("returns notifications list", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.list();
    expect(Array.isArray(result)).toBe(true);
    // notifications may be empty initially, just check it's an array
    if (result.length > 0) {
      const notification = result[0];
      expect(notification).toHaveProperty("id");
      expect(notification).toHaveProperty("title");
      expect(notification).toHaveProperty("type");
    }
  });
});
