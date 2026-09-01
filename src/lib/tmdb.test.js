import { beforeEach, describe, expect, it, vi } from "vitest";
import { extractMainCast, findShowByTitle, getShowDetails, getTrendingKdramas } from "./tmdb";

const show = (overrides) => ({
  id: 1,
  name: "A Drama",
  original_language: "ko",
  backdrop_path: "/backdrop.jpg",
  genre_ids: [18],
  ...overrides,
});

describe("getTrendingKdramas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  it("queries the current year, scripted types only", async () => {
    fetch.mockResolvedValue({
      json: async () => ({
        results: Array.from({ length: 6 }, (_, i) => show({ id: i + 1, name: `Drama ${i + 1}` })),
      }),
    });

    const { data } = await getTrendingKdramas(5);

    const url = fetch.mock.calls[0][0];
    expect(url).toContain(`first_air_date.gte=${new Date().getFullYear()}-01-01`);
    expect(url).toContain("with_type=2|4");
    expect(url).toContain("without_genres=10764,10767,10763,99");
    expect(data).toHaveLength(5);
  });

  it("drops reality and variety shows that slip through", async () => {
    fetch.mockResolvedValue({
      json: async () => ({
        results: [
          show({ id: 1, name: "Running Man", genre_ids: [10764] }),
          show({ id: 2, name: "Talk Show", genre_ids: [10767] }),
          show({ id: 3, name: "A Documentary", genre_ids: [99] }),
          show({ id: 4, name: "Twinkling Watermelon", genre_ids: [18, 10765] }),
        ],
      }),
    });

    const { data } = await getTrendingKdramas(5);

    expect(data.map((s) => s.name)).toEqual(["Twinkling Watermelon"]);
  });

  it("skips non-Korean titles and anything without banner art", async () => {
    fetch.mockResolvedValue({
      json: async () => ({
        results: [
          show({ id: 1, name: "An English Show", original_language: "en" }),
          show({ id: 2, name: "No Artwork", backdrop_path: null }),
          show({ id: 3, name: "Keeper" }),
        ],
      }),
    });

    const { data } = await getTrendingKdramas(5);

    expect(data.map((s) => s.name)).toEqual(["Keeper"]);
  });

  it("falls back through all three sources without repeating a title", async () => {
    fetch
      .mockResolvedValueOnce({ json: async () => ({ results: [show({ id: 1, name: "This Year" })] }) })
      .mockResolvedValueOnce({ json: async () => ({ results: [show({ id: 1, name: "This Year" })] }) })
      .mockResolvedValueOnce({ json: async () => ({ results: [show({ id: 2, name: "All Time" })] }) });

    const { data } = await getTrendingKdramas(5);

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(data.map((s) => s.name)).toEqual(["This Year", "All Time"]);
  });

  it("requests credits alongside the show details", async () => {
    fetch.mockResolvedValue({ json: async () => ({ id: 5, number_of_episodes: 16 }) });

    await getShowDetails(5);

    expect(fetch.mock.calls[0][0]).toContain("append_to_response=credits");
  });

  it("returns empty rather than throwing when TMDb is unreachable", async () => {
    fetch.mockRejectedValue(new Error("offline"));

    const { data, error } = await getTrendingKdramas(5);

    expect(data).toEqual([]);
    expect(error).toBeInstanceOf(Error);
  });
});

describe("extractMainCast", () => {
  const details = {
    credits: {
      cast: Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Actor ${i + 1}`,
        character: `Role ${i + 1}`,
        profile_path: i === 0 ? "/face.jpg" : null,
        order: i,
      })),
    },
  };

  it("keeps the top-billed six with just the fields the UI needs", () => {
    const cast = extractMainCast(details);

    expect(cast).toHaveLength(6);
    expect(cast[0]).toEqual({
      id: 1,
      name: "Actor 1",
      character: "Role 1",
      profile_path: "/face.jpg",
    });
    // `order` and other TMDb fields are dropped rather than stored.
    expect(Object.keys(cast[1])).toEqual(["id", "name", "character", "profile_path"]);
    expect(cast[1].profile_path).toBeNull();
  });

  it("returns an empty list when a show has no credits", () => {
    expect(extractMainCast({})).toEqual([]);
    expect(extractMainCast(null)).toEqual([]);
  });
});

describe("findShowByTitle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  it("prefers the Korean show when a title is shared with a Western one", async () => {
    fetch.mockResolvedValue({
      json: async () => ({
        results: [
          { id: 1, name: "Big Mouth", original_language: "en" },
          { id: 2, name: "Big Mouth", original_language: "ko" },
        ],
      }),
    });

    const { data } = await findShowByTitle("Big Mouth");

    expect(data.id).toBe(2);
  });

  it("falls back to the parent series for sequel titles", async () => {
    fetch
      .mockResolvedValueOnce({ json: async () => ({ results: [] }) })
      .mockResolvedValueOnce({
        json: async () => ({ results: [{ id: 9, name: "The Glory", original_language: "ko" }] }),
      });

    const { data } = await findShowByTitle("The Glory Part 2");

    expect(fetch.mock.calls[1][0]).toContain(encodeURIComponent("The Glory"));
    expect(data.id).toBe(9);
  });

  it("does not mistake a year for a sequel number", async () => {
    fetch.mockResolvedValue({ json: async () => ({ results: [] }) });

    await findShowByTitle("Reply 1988");

    // No second lookup: the title was left alone.
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
