import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Watchlist from "./Watchlist";

const { mockGetDramas, mockSignOut, mockUpdateDrama } = vi.hoisted(() => ({
  mockGetDramas: vi.fn(),
  mockSignOut: vi.fn(),
  mockUpdateDrama: vi.fn(),
}));

vi.mock("../lib/supabase", () => ({
  getDramas: mockGetDramas,
  signOut: mockSignOut,
  updateDrama: mockUpdateDrama,
}));

vi.mock("../components/AddDramaModal", () => ({
  default: () => <div data-testid="add-drama-modal" />,
}));

vi.mock("../components/DramaDetailModal", () => ({
  default: () => null,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe("Watchlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDramas.mockResolvedValue({
      data: [
        { id: "1", title: "Lovely Runner", status: "watching", year_watched: 2024 },
        { id: "2", title: "Crash Landing on You", status: "completed", year_watched: 2020 },
        { id: "3", title: "The Glory", status: "completed", year_watched: 2023 },
      ],
      error: null,
    });
  });

  it("does not render the fetch posters button", async () => {
    render(<Watchlist user={{ email: "user@example.com" }} showToast={vi.fn()} />);

    expect(await screen.findByText("Lovely Runner")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /fetch posters/i })).not.toBeInTheDocument();
  });

  it("shows genres and status badges on drama cards", async () => {
    mockGetDramas.mockResolvedValueOnce({
      data: [
        {
          id: "1",
          title: "Lovely Runner",
          status: "watching",
          year_watched: 2024,
          genres: ["Romance", "Comedy"],
        },
      ],
      error: null,
    });

    render(<Watchlist user={{ email: "user@example.com" }} showToast={vi.fn()} />);

    expect(await screen.findByText("Lovely Runner")).toBeInTheDocument();
    expect(screen.getByText("Romance, Comedy")).toBeInTheDocument();
    expect(screen.getByText("Watching", { selector: "span" })).toBeInTheDocument();
  });

  it("shows watchlist stats summary", async () => {
    render(<Watchlist user={{ email: "user@example.com" }} showToast={vi.fn()} />);

    expect(await screen.findByText("Lovely Runner")).toBeInTheDocument();
    expect(screen.getByText("Total dramas")).toBeInTheDocument();
    expect(screen.getByText("Avg. rating")).toBeInTheDocument();
  });

  it("renders a featured banner for popular ongoing dramas", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            id: 12345,
            name: "Lovely Runner",
            overview: "A charming and emotional romance.",
            poster_path: "/poster.jpg",
            original_language: "ko",
            origin_country: ["KR"],
          },
        ],
      }),
    });

    render(<Watchlist user={{ email: "user@example.com" }} showToast={vi.fn()} />);

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("/discover/tv"));
    expect(await screen.findByText("Popular K-dramas")).toBeInTheDocument();
    expect(screen.getByText("Lovely Runner", { selector: "h3" })).toBeInTheDocument();
  });

  it("makes the featured banner link to the selected drama on TMDb", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            id: 12345,
            name: "Lovely Runner",
            overview: "A charming and emotional romance.",
            poster_path: "/poster.jpg",
            original_language: "ko",
            origin_country: ["KR"],
          },
        ],
      }),
    });

    render(<Watchlist user={{ email: "user@example.com" }} showToast={vi.fn()} />);

    const link = await screen.findByRole("link", { name: /open lovely runner on tmdb/i });
    expect(link).toHaveAttribute("href", "https://www.themoviedb.org/tv/12345");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("filters dramas by the search query", async () => {
    render(<Watchlist user={{ email: "user@example.com" }} showToast={vi.fn()} />);

    expect(await screen.findByText("Lovely Runner", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("Crash Landing on You", { selector: "p" })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search dramas..."), {
      target: { value: "runner" },
    });

    expect(screen.getByText("Lovely Runner", { selector: "p" })).toBeInTheDocument();
    expect(screen.queryByText("Crash Landing on You", { selector: "p" })).not.toBeInTheDocument();
  });

  it("sorts dramas by title when selected", async () => {
    render(<Watchlist user={{ email: "user@example.com" }} showToast={vi.fn()} />);

    expect(await screen.findByText("Lovely Runner", { selector: "p" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Sort by"), {
      target: { value: "title" },
    });

    const cardList = screen.getByText("Showing 3 results").closest("div").parentElement;
    const dramaTitles = Array.from(cardList.querySelectorAll("p, h3")).map((node) => node.textContent).filter(Boolean);
    expect(dramaTitles).toContain("Crash Landing on You");
  });

  it("filters dramas by the selected watched year", async () => {
    render(<Watchlist user={{ email: "user@example.com" }} showToast={vi.fn()} />);

    expect(await screen.findByText("Lovely Runner", { selector: "p" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Filter by year watched"), {
      target: { value: "2023" },
    });

    expect(screen.getByText("The Glory", { selector: "p" })).toBeInTheDocument();
    expect(screen.queryByText("Lovely Runner", { selector: "p" })).not.toBeInTheDocument();
    expect(screen.queryByText("Crash Landing on You", { selector: "p" })).not.toBeInTheDocument();
  });
});
