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

  it("filters dramas by the search query", async () => {
    render(<Watchlist user={{ email: "user@example.com" }} showToast={vi.fn()} />);

    expect(await screen.findByText("Lovely Runner")).toBeInTheDocument();
    expect(screen.getByText("Crash Landing on You")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search dramas..."), {
      target: { value: "runner" },
    });

    expect(screen.getByText("Lovely Runner")).toBeInTheDocument();
    expect(screen.queryByText("Crash Landing on You")).not.toBeInTheDocument();
  });

  it("sorts dramas by year watched when selected", async () => {
    render(<Watchlist user={{ email: "user@example.com" }} showToast={vi.fn()} />);

    expect(await screen.findByText("Lovely Runner")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Sort by year watched"), {
      target: { value: "newest" },
    });

    const dramaCards = screen.getAllByText(/Lovely Runner|Crash Landing on You|The Glory/).map((node) => node.textContent);
    expect(dramaCards[0]).toBe("Lovely Runner");
  });

  it("filters dramas by the selected watched year", async () => {
    render(<Watchlist user={{ email: "user@example.com" }} showToast={vi.fn()} />);

    expect(await screen.findByText("Lovely Runner")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Filter by year watched"), {
      target: { value: "2023" },
    });

    expect(screen.getByText("The Glory")).toBeInTheDocument();
    expect(screen.queryByText("Lovely Runner")).not.toBeInTheDocument();
    expect(screen.queryByText("Crash Landing on You")).not.toBeInTheDocument();
  });
});
