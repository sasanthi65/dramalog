import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Watchlist from "./Watchlist";

const { mockGetDramas, mockSignOut, mockUpdateDrama, mockGetTrending, mockGetShowDetails } = vi.hoisted(() => ({
  mockGetDramas: vi.fn(),
  mockSignOut: vi.fn(),
  mockUpdateDrama: vi.fn(),
  mockGetTrending: vi.fn(),
  mockGetShowDetails: vi.fn(),
}));

vi.mock("../lib/supabase", () => ({
  getDramas: mockGetDramas,
  signOut: mockSignOut,
  updateDrama: mockUpdateDrama,
}));

vi.mock("../lib/tmdb", () => ({
  getTrendingKdramas: mockGetTrending,
  getShowDetails: mockGetShowDetails,
  tmdbImage: (path, size = "w780") =>
    path ? `https://image.tmdb.org/t/p/${size}${path}` : null,
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
    // Default: TMDb unavailable, so the banner falls back to local content.
    mockGetTrending.mockResolvedValue({ data: [], error: null });
    mockGetShowDetails.mockResolvedValue({ data: { number_of_episodes: 16 }, error: null });
    mockGetDramas.mockResolvedValue({
      data: [
        { id: "1", title: "Lovely Runner", status: "watching", year_watched: 2024 },
        { id: "2", title: "Crash Landing on You", status: "completed", year_watched: 2020 },
      ],
      error: null,
    });
  });

  it("renders the redesigned watchlist hero and filters dramas", async () => {
    render(<Watchlist user={{ email: "user@example.com" }} showToast={vi.fn()} />);

    expect(await screen.findByText("Lovely Runner")).toBeInTheDocument();
    expect(screen.getByText("Crash Landing on You")).toBeInTheDocument();
    expect(screen.getByText("Your watchlist, reimagined.")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search dramas..."), {
      target: { value: "runner" },
    });

    expect(screen.getByText("Lovely Runner")).toBeInTheDocument();
    expect(screen.queryByText("Crash Landing on You")).not.toBeInTheDocument();
  });

  it("finds dramas by cast member and sorts by lead actor", async () => {
    mockGetDramas.mockResolvedValue({
      data: [
        {
          id: "1",
          title: "Lovely Runner",
          status: "completed",
          year_watched: 2024,
          main_cast: [{ id: 10, name: "Byeon Woo-seok", character: "Ryu Sun-jae" }],
        },
        {
          id: "2",
          title: "Strong Girl Nam-soon",
          status: "completed",
          year_watched: 2023,
          main_cast: [{ id: 11, name: "Lee Yoo-mi", character: "Gang Nam-soon" }],
        },
        {
          id: "3",
          title: "Twenty-Five Twenty-One",
          status: "completed",
          year_watched: 2022,
          main_cast: [{ id: 10, name: "Byeon Woo-seok", character: "Moon Ji-woong" }],
        },
      ],
      error: null,
    });

    render(<Watchlist user={{ email: "user@example.com" }} showToast={vi.fn()} />);
    expect(await screen.findByText("Lovely Runner")).toBeInTheDocument();

    // Searching by actor name surfaces every drama they appear in.
    fireEvent.change(screen.getByPlaceholderText("Search dramas..."), {
      target: { value: "byeon woo" },
    });

    expect(screen.getByText("Lovely Runner")).toBeInTheDocument();
    expect(screen.getByText("Twenty-Five Twenty-One")).toBeInTheDocument();
    expect(screen.queryByText("Strong Girl Nam-soon")).not.toBeInTheDocument();

    // A character name works too.
    fireEvent.change(screen.getByPlaceholderText("Search dramas..."), {
      target: { value: "nam-soon" },
    });
    expect(screen.getByText("Strong Girl Nam-soon")).toBeInTheDocument();
    expect(screen.queryByText("Lovely Runner")).not.toBeInTheDocument();

    // Sorting by lead actor groups an actor's dramas together.
    fireEvent.change(screen.getByPlaceholderText("Search dramas..."), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Sort dramas"), { target: { value: "actor" } });

    const titles = screen.getAllByRole("heading", { level: 3 }).map((node) => node.textContent);
    expect(titles).toEqual([
      "Lovely Runner",
      "Twenty-Five Twenty-One",
      "Strong Girl Nam-soon",
    ]);
  });

  it("features trending K-dramas from TMDb in the banner", async () => {
    mockGetTrending.mockResolvedValue({
      data: [
        {
          id: 900,
          name: "When Life Gives You Tangerines",
          overview: "A Jeju island love story spanning decades.",
          backdrop_path: "/backdrop.jpg",
          poster_path: "/poster.jpg",
          original_language: "ko",
        },
      ],
      error: null,
    });

    render(<Watchlist user={{ email: "user@example.com" }} showToast={vi.fn()} />);

    expect(await screen.findByText("When Life Gives You Tangerines")).toBeInTheDocument();
    expect(
      screen.getByText(`Trending in ${new Date().getFullYear()}`)
    ).toBeInTheDocument();
    expect(screen.getByText("A Jeju island love story spanning decades.")).toBeInTheDocument();
    // Trending titles are not in the collection, so they offer an add action.
    expect(screen.getByText("Add to watchlist")).toBeInTheDocument();
    // The editorial fallback is displaced.
    expect(screen.queryByText("Your watchlist, reimagined.")).not.toBeInTheDocument();
  });

  it("auto-advances the banner and pauses on hover", async () => {
    vi.useFakeTimers();
    mockGetTrending.mockResolvedValue({
      data: [
        { id: 1, name: "First Drama", overview: "One.", backdrop_path: "/a.jpg", poster_path: "/a.jpg", original_language: "ko" },
        { id: 2, name: "Second Drama", overview: "Two.", backdrop_path: "/b.jpg", poster_path: "/b.jpg", original_language: "ko" },
      ],
      error: null,
    });

    render(<Watchlist user={{ email: "user@example.com" }} showToast={vi.fn()} />);
    await act(async () => {});

    expect(screen.getByRole("heading", { name: "First Drama" })).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(7000);
    });
    expect(screen.getByRole("heading", { name: "Second Drama" })).toBeInTheDocument();

    // Hovering holds the current slide.
    fireEvent.mouseEnter(screen.getByLabelText("Featured dramas"));
    await act(async () => {
      vi.advanceTimersByTime(21000);
    });
    expect(screen.getByRole("heading", { name: "Second Drama" })).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("flags a trending drama that is already saved", async () => {
    mockGetDramas.mockResolvedValue({
      data: [{ id: "1", title: "Lovely Runner", status: "watching", tmdb_id: "900" }],
      error: null,
    });
    mockGetTrending.mockResolvedValue({
      data: [
        {
          id: 900,
          name: "Lovely Runner",
          overview: "A time-slip romance.",
          backdrop_path: "/backdrop.jpg",
          poster_path: "/poster.jpg",
          original_language: "ko",
        },
      ],
      error: null,
    });

    render(<Watchlist user={{ email: "user@example.com" }} showToast={vi.fn()} />);

    expect(await screen.findByText("Already in your watchlist")).toBeInTheDocument();
    expect(screen.queryByText("Add to watchlist")).not.toBeInTheDocument();
  });

  it("paginates the collection at 36 dramas per page", async () => {
    mockGetDramas.mockResolvedValue({
      data: Array.from({ length: 120 }, (_, index) => ({
        id: String(index + 1),
        title: `Drama ${String(index + 1).padStart(3, "0")}`,
        status: "completed",
        year_watched: 2000 + index,
      })),
      error: null,
    });

    render(<Watchlist user={{ email: "user@example.com" }} showToast={vi.fn()} />);

    // First page holds 36 of the 120 titles.
    expect(await screen.findByText("Drama 001")).toBeInTheDocument();
    expect(screen.getByText("Drama 036")).toBeInTheDocument();
    expect(screen.queryByText("Drama 037")).not.toBeInTheDocument();
    expect(
      screen.getByText("Showing 1–36 of 120 dramas in your collection")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Page 1")).toHaveAttribute("aria-current", "page");
    expect(screen.getByLabelText("First page")).toBeDisabled();
    expect(screen.getByLabelText("Previous page")).toBeDisabled();

    // Jump straight to a numbered page — 120 titles span 4 pages of 36.
    fireEvent.click(screen.getByLabelText("Page 4"));

    expect(screen.getByText("Drama 109")).toBeInTheDocument();
    expect(screen.getByText("Drama 120")).toBeInTheDocument();
    expect(screen.queryByText("Drama 036")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Page 4")).toHaveAttribute("aria-current", "page");
    expect(screen.getByLabelText("Next page")).toBeDisabled();
    expect(screen.getByLabelText("Last page")).toBeDisabled();

    // Skip back to the first page.
    fireEvent.click(screen.getByLabelText("First page"));
    expect(screen.getByText("Drama 001")).toBeInTheDocument();

    // Skip to the last page.
    fireEvent.click(screen.getByLabelText("Last page"));
    expect(screen.getByText("Drama 120")).toBeInTheDocument();

    // Narrowing the filter drops back to a single page.
    fireEvent.change(screen.getByPlaceholderText("Search dramas..."), {
      target: { value: "Drama 11" },
    });

    // Matches Drama 110–119, which fits on a single page.
    expect(screen.getByText("Drama 110")).toBeInTheDocument();
    expect(screen.getByText("Drama 119")).toBeInTheDocument();
    expect(screen.queryByLabelText("Page 2")).not.toBeInTheDocument();
  });

  it("collapses long page runs with ellipses", async () => {
    mockGetDramas.mockResolvedValue({
      data: Array.from({ length: 600 }, (_, index) => ({
        id: String(index + 1),
        title: `Drama ${String(index + 1).padStart(3, "0")}`,
        status: "completed",
        year_watched: 2000 + index,
      })),
      error: null,
    });

    render(<Watchlist user={{ email: "user@example.com" }} showToast={vi.fn()} />);

    // 17 pages: first, last and a window around the current page only.
    expect(await screen.findByLabelText("Page 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Page 17")).toBeInTheDocument();
    expect(screen.queryByLabelText("Page 6")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Page 17"));

    expect(screen.getByLabelText("Page 16")).toBeInTheDocument();
    expect(screen.queryByLabelText("Page 2")).not.toBeInTheDocument();
  });
});
