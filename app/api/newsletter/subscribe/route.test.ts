import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/newsletter", () => ({ subscribeToNewsletter: vi.fn() }));
vi.mock("@/lib/server/notify", () => ({ notifyOwner: vi.fn() }));
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  // Poza runtime Next.js after() nie ma kontekstu żądania - wykonujemy callback od razu.
  return { ...actual, after: vi.fn((callback: () => unknown) => callback()) };
});

import { subscribeToNewsletter } from "@/lib/server/newsletter";
import { notifyOwner } from "@/lib/server/notify";

let ipCounter = 0;

function makeRequest(body: unknown, ip = `10.0.0.${++ipCounter}`) {
  return new Request("http://localhost/api/newsletter/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/newsletter/subscribe", () => {
  let POST: typeof import("./route").POST;

  beforeEach(async () => {
    // Świeży moduł limitera przy każdym teście, żeby liczniki z innych testów nie przeciekały.
    vi.resetModules();
    ({ POST } = await import("./route"));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("zapisuje adres, zwraca 200 i powiadamia właściciela", async () => {
    vi.mocked(subscribeToNewsletter).mockResolvedValue({ status: "subscribed" });

    const response = await POST(makeRequest({ email: " Nowy@Example.pl " }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, status: "subscribed" });
    expect(subscribeToNewsletter).toHaveBeenCalledWith(" Nowy@Example.pl ", "homepage");
    expect(notifyOwner).toHaveBeenCalledWith("Family Ride: nowy zapis na newsletter", [
      "Ktoś zapisał się na newsletter.",
      "E-mail: nowy@example.pl",
    ]);
  });

  it("dla istniejącego adresu zwraca 200 ze statusem exists i nie wysyła maila", async () => {
    vi.mocked(subscribeToNewsletter).mockResolvedValue({ status: "exists" });

    const response = await POST(makeRequest({ email: "jest@example.pl" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, status: "exists" });
    expect(notifyOwner).not.toHaveBeenCalled();
  });

  it("dla niepoprawnego adresu zwraca 400 z komunikatem, który rozpoznaje formularz", async () => {
    vi.mocked(subscribeToNewsletter).mockResolvedValue({ status: "invalid" });

    const response = await POST(makeRequest({ email: "zly" }));

    expect(response.status).toBe(400);
    // HomeClient porównuje dokładnie ten tekst, żeby pokazać "Podaj poprawny adres e-mail."
    expect(await response.json()).toEqual({ error: "Podaj poprawny adres e-mail." });
  });

  it("traktuje brak lub nie-tekstowy email jako pusty string", async () => {
    vi.mocked(subscribeToNewsletter).mockResolvedValue({ status: "invalid" });

    await POST(makeRequest({ email: 123 }));

    expect(subscribeToNewsletter).toHaveBeenCalledWith("", "homepage");
  });

  it("dla zepsutego JSON-a zwraca 400 bez dotykania magazynu", async () => {
    const response = await POST(makeRequest("{nie-json"));

    expect(response.status).toBe(400);
    expect(subscribeToNewsletter).not.toHaveBeenCalled();
  });

  it("gdy zapis się wywali, zwraca 500 i nie wysyła maila", async () => {
    vi.mocked(subscribeToNewsletter).mockRejectedValue(new Error("blob down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(makeRequest({ email: "a@example.pl" }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Nie udało się zapisać do newslettera." });
    expect(notifyOwner).not.toHaveBeenCalled();
  });

  it("po 5 próbach z jednego IP w oknie 10 min zwraca 429", async () => {
    vi.mocked(subscribeToNewsletter).mockResolvedValue({ status: "exists" });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await POST(makeRequest({ email: "a@example.pl" }, "1.2.3.4"))).status).toBe(200);
    }
    const blocked = await POST(makeRequest({ email: "a@example.pl" }, "1.2.3.4"));

    expect(blocked.status).toBe(429);
    expect(subscribeToNewsletter).toHaveBeenCalledTimes(5);
    // Inny adres IP nie jest blokowany.
    expect((await POST(makeRequest({ email: "a@example.pl" }, "5.6.7.8"))).status).toBe(200);
  });
});
