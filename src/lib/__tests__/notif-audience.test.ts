import { describe, it, expect } from "vitest";
import { notifVisibleFor, AUD_FINANCE, AUD_CONTENT, type AudienceUser } from "../notif-audience";

const dominika: AudienceUser = { roles: ["fakturace"], displayName: "Dominika Mendrek", email: "fakturace@onvision.cz" };
const zdenek: AudienceUser = { roles: ["produkce", "smm"], displayName: "Zdeněk Dolíhal", email: "zdenek@onvision.cz" };
const admin: AudienceUser = { roles: ["admin"], displayName: "Adam Mendrek", email: "info@onvision.cz" };

describe("notifVisibleFor", () => {
  it("admin vidí vše", () => {
    expect(notifVisibleFor({ kind: "person", name: "Zdeněk" }, admin)).toBe(true);
    expect(notifVisibleFor(AUD_CONTENT, admin)).toBe(true);
    expect(notifVisibleFor(undefined, admin)).toBe(true);
  });

  it("finance vidí finanční upozornění, ne obsahová", () => {
    expect(notifVisibleFor(AUD_FINANCE, dominika)).toBe(true);
    expect(notifVisibleFor(AUD_CONTENT, dominika)).toBe(false);
  });

  it("úkol vidí jen přiřazená osoba", () => {
    expect(notifVisibleFor({ kind: "person", name: "Dominika" }, dominika)).toBe(true);
    expect(notifVisibleFor({ kind: "person", name: "Zdeněk" }, dominika)).toBe(false);
    expect(notifVisibleFor({ kind: "person", name: "Zdeněk Dolíhal" }, zdenek)).toBe(true);
  });

  it("e-mailové cílení: shoda nebo broadcast", () => {
    expect(notifVisibleFor({ kind: "email", email: "fakturace@onvision.cz" }, dominika)).toBe(true);
    expect(notifVisibleFor({ kind: "email", email: "zdenek@onvision.cz" }, dominika)).toBe(false);
    expect(notifVisibleFor({ kind: "email", email: null }, dominika)).toBe(true);
  });

  it("neznámé cílení = jen admin (fail-closed)", () => {
    expect(notifVisibleFor(undefined, dominika)).toBe(false);
  });

  it("během načítání (user null) neblokuje", () => {
    expect(notifVisibleFor(AUD_CONTENT, null)).toBe(true);
  });
});
