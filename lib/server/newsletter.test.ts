import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@vercel/blob", () => ({
  list: vi.fn(),
  put: vi.fn(),
}));

import { list, put } from "@vercel/blob";
import { subscribeToNewsletter } from "./newsletter";

describe("subscribeToNewsletter (lokalny magazyn plikowy)", () => {
  let tmpDir: string;
  let subscribersFile: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "newsletter-test-"));
    subscribersFile = path.join(tmpDir, ".data", "newsletter", "subscribers.json");
    vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tmpDir, { recursive: true, force: true });
  });

  async function readStored() {
    return JSON.parse(await readFile(subscribersFile, "utf-8")) as {
      subscribers: { email: string; source: string; createdAt: string }[];
    };
  }

  it("zapisuje nowy adres znormalizowany do małych liter i bez spacji", async () => {
    const result = await subscribeToNewsletter("  Jan.Kowalski@Example.PL ", "homepage");

    expect(result).toEqual({ status: "subscribed" });
    const stored = await readStored();
    expect(stored.subscribers).toHaveLength(1);
    expect(stored.subscribers[0]).toMatchObject({ email: "jan.kowalski@example.pl", source: "homepage" });
    expect(Number.isNaN(Date.parse(stored.subscribers[0].createdAt))).toBe(false);
  });

  it("nie dubluje adresu, także przy innej wielkości liter", async () => {
    await subscribeToNewsletter("ala@example.pl");
    const result = await subscribeToNewsletter("ALA@example.pl");

    expect(result).toEqual({ status: "exists" });
    expect((await readStored()).subscribers).toHaveLength(1);
  });

  it("dopisuje kolejne adresy na początek listy, nie gubiąc starych", async () => {
    await subscribeToNewsletter("pierwszy@example.pl");
    await subscribeToNewsletter("drugi@example.pl");

    const emails = (await readStored()).subscribers.map((item) => item.email);
    expect(emails).toEqual(["drugi@example.pl", "pierwszy@example.pl"]);
  });

  it.each(["", "bez-malpy.pl", "a@b", "spacja w@srodku.pl", "@example.pl"])(
    "odrzuca niepoprawny adres %j i nic nie zapisuje",
    async (email) => {
      const result = await subscribeToNewsletter(email);

      expect(result).toEqual({ status: "invalid" });
      await expect(readFile(subscribersFile, "utf-8")).rejects.toMatchObject({ code: "ENOENT" });
    },
  );

  it("przy uszkodzonym pliku rzuca błąd zamiast nadpisać listę", async () => {
    await mkdir(path.dirname(subscribersFile), { recursive: true });
    await writeFile(subscribersFile, "{ to nie jest json", "utf-8");

    await expect(subscribeToNewsletter("nowy@example.pl")).rejects.toThrow();
    expect(await readFile(subscribersFile, "utf-8")).toBe("{ to nie jest json");
  });
});

describe("subscribeToNewsletter (Vercel Blob)", () => {
  const blobUrl = "https://blob.example/newsletter/subscribers.json";
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-token");
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(list).mockResolvedValue({
      blobs: [{ pathname: "newsletter/subscribers.json", url: blobUrl, uploadedAt: new Date("2026-01-01T00:00:00Z") }],
    } as unknown as Awaited<ReturnType<typeof list>>);
    vi.mocked(put).mockResolvedValue({} as Awaited<ReturnType<typeof put>>);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  function existingList(...emails: string[]) {
    return Response.json({
      subscribers: emails.map((email) => ({ email, createdAt: "2026-01-01T00:00:00.000Z", source: "homepage" })),
    });
  }

  it("czyta listę z adresem z cache-bustingiem i dopisuje nowy adres do istniejących", async () => {
    fetchMock.mockResolvedValue(existingList("stary@example.pl"));

    const result = await subscribeToNewsletter("nowy@example.pl");

    expect(result).toEqual({ status: "subscribed" });
    expect(fetchMock).toHaveBeenCalledWith(`${blobUrl}?v=${Date.parse("2026-01-01T00:00:00Z")}`, { cache: "no-store" });
    expect(put).toHaveBeenCalledTimes(1);
    const [pathname, body, options] = vi.mocked(put).mock.calls[0];
    expect(pathname).toBe("newsletter/subscribers.json");
    expect(options).toMatchObject({ allowOverwrite: true, addRandomSuffix: false, token: "test-token" });
    const emails = (JSON.parse(body as string) as { subscribers: { email: string }[] }).subscribers.map((s) => s.email);
    expect(emails).toEqual(["nowy@example.pl", "stary@example.pl"]);
  });

  it("tworzy listę od zera, gdy bloba jeszcze nie ma", async () => {
    vi.mocked(list).mockResolvedValue({ blobs: [] } as unknown as Awaited<ReturnType<typeof list>>);

    await expect(subscribeToNewsletter("pierwszy@example.pl")).resolves.toEqual({ status: "subscribed" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(put).toHaveBeenCalledTimes(1);
  });

  it("nie zapisuje niczego, gdy adres już jest na liście", async () => {
    fetchMock.mockResolvedValue(existingList("jest@example.pl"));

    await expect(subscribeToNewsletter("Jest@Example.pl")).resolves.toEqual({ status: "exists" });
    expect(put).not.toHaveBeenCalled();
  });

  // Regresja: wcześniej każdy błąd odczytu dawał "[]", a zapis nadpisywał wtedy całą listę jednym adresem.
  it.each([
    ["CDN zwraca 500", () => fetchMock.mockResolvedValue(new Response("boom", { status: 500 }))],
    ["fetch rzuca błąd sieci", () => fetchMock.mockRejectedValue(new TypeError("fetch failed"))],
    ["list() z Blob rzuca błąd", () => vi.mocked(list).mockRejectedValue(new Error("blob down"))],
    ["payload bez tablicy subscribers", () => fetchMock.mockResolvedValue(Response.json({ foo: 1 }))],
  ])("gdy %s - rzuca błąd i NIE nadpisuje listy", async (_label, arrange) => {
    arrange();

    await expect(subscribeToNewsletter("nowy@example.pl")).rejects.toThrow();
    expect(put).not.toHaveBeenCalled();
  });
});
