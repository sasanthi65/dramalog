import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AddDramaModal from "./AddDramaModal";
import { addDrama } from "../lib/supabase";

vi.mock("../lib/supabase", () => ({
  addDrama: vi.fn(),
}));

const tmdbResult = {
  id: 123,
  name: "Lovely Runner",
  overview: "A time-slip romance.",
  first_air_date: "2024-04-08",
  genre_ids: [18, 35],
  poster_path: "/poster.jpg",
};

describe("AddDramaModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  it("searches TMDB and adds the selected drama", async () => {
    const onDramaAdded = vi.fn();
    const savedDrama = { id: "saved-1", title: "Lovely Runner" };
    fetch.mockResolvedValue({
      json: async () => ({ results: [tmdbResult] }),
    });
    addDrama.mockResolvedValue({ data: [savedDrama], error: null });

    render(
      <AddDramaModal
        userId="user-1"
        onDramaAdded={onDramaAdded}
        onClose={vi.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Search for a drama..."), {
      target: { value: "Lovely Runner" },
    });
    fireEvent.click(screen.getByText("Search"));

    expect(await screen.findByText("Lovely Runner")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Lovely Runner"));
    fireEvent.change(screen.getByLabelText("Rating (1-10)"), {
      target: { value: "8" },
    });
    fireEvent.change(screen.getByLabelText("Review"), {
      target: { value: "Bright and fun." },
    });
    fireEvent.click(screen.getByText("Add to watchlist"));

    await waitFor(() => {
      expect(addDrama).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-1",
          title: "Lovely Runner",
          tmdb_id: "123",
          poster_url: "https://image.tmdb.org/t/p/w500/poster.jpg",
          genres: ["Drama", "Comedy"],
          year_released: 2024,
          rating: 8,
          review: "Bright and fun.",
        })
      );
    });
    expect(onDramaAdded).toHaveBeenCalledWith(savedDrama);
  });

  it("hides episodes watched for a completed drama and records it as fully watched", async () => {
    fetch.mockImplementation(async (url) =>
      String(url).includes("/search/tv")
        ? { json: async () => ({ results: [tmdbResult] }) }
        : { json: async () => ({ number_of_episodes: 16 }) }
    );
    addDrama.mockResolvedValue({ data: [{ id: "saved-1" }], error: null });

    render(
      <AddDramaModal userId="user-1" onDramaAdded={vi.fn()} onClose={vi.fn()} />
    );

    fireEvent.change(screen.getByPlaceholderText("Search for a drama..."), {
      target: { value: "Lovely Runner" },
    });
    fireEvent.click(screen.getByText("Search"));
    fireEvent.click(await screen.findByText("Lovely Runner"));

    // Status defaults to completed, so progress is not asked for.
    await waitFor(() => {
      expect(screen.getByLabelText("Total episodes")).toHaveValue(16);
    });
    expect(screen.queryByLabelText("Episodes watched")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Add to watchlist"));

    await waitFor(() => {
      expect(addDrama).toHaveBeenCalledWith(
        expect.objectContaining({ total_episodes: 16, episodes_watched: 16 })
      );
    });
  });

  it("asks for progress once the status is not completed", async () => {
    fetch.mockImplementation(async (url) =>
      String(url).includes("/search/tv")
        ? { json: async () => ({ results: [tmdbResult] }) }
        : { json: async () => ({ number_of_episodes: 16 }) }
    );

    render(
      <AddDramaModal userId="user-1" onDramaAdded={vi.fn()} onClose={vi.fn()} />
    );

    fireEvent.change(screen.getByPlaceholderText("Search for a drama..."), {
      target: { value: "Lovely Runner" },
    });
    fireEvent.click(screen.getByText("Search"));
    fireEvent.click(await screen.findByText("Lovely Runner"));

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "watching" } });

    expect(screen.getByLabelText("Episodes watched")).toBeInTheDocument();
  });

  it("shows an error when searching without a title", () => {
    render(
      <AddDramaModal
        userId="user-1"
        onDramaAdded={vi.fn()}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText("Search"));

    expect(screen.getByText("Please enter a drama title")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
