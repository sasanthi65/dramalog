import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DramaDetailModal from "./DramaDetailModal";
import { updateDrama } from "../lib/supabase";

vi.mock("../lib/supabase", () => ({
  updateDrama: vi.fn(),
  deleteDrama: vi.fn(),
}));

const { mockFindShowByTitle, mockGetShowDetails } = vi.hoisted(() => ({
  mockFindShowByTitle: vi.fn(),
  mockGetShowDetails: vi.fn(),
}));

vi.mock("../lib/tmdb", async () => {
  const actual = await vi.importActual("../lib/tmdb");
  return {
    ...actual,
    findShowByTitle: mockFindShowByTitle,
    getShowDetails: mockGetShowDetails,
  };
});

const watchingDrama = {
  id: "drama-1",
  title: "Twinkling Watermelon",
  status: "watching",
  total_episodes: 16,
  episodes_watched: 12,
};

const renderModal = (drama, props = {}) =>
  render(
    <DramaDetailModal
      drama={drama}
      onUpdated={vi.fn()}
      onProgressUpdated={vi.fn()}
      onDeleted={vi.fn()}
      onClose={vi.fn()}
      {...props}
    />
  );

describe("DramaDetailModal episode tracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    updateDrama.mockResolvedValue({ data: [{ ...watchingDrama }], error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows current progress against the total", () => {
    renderModal(watchingDrama);

    expect(screen.getByLabelText("Episodes watched")).toHaveValue(12);
    expect(screen.getByText("16")).toBeInTheDocument();
    expect(screen.getByText("4 episodes to go.")).toBeInTheDocument();
    expect(screen.getByLabelText("Episode progress")).toHaveAttribute("aria-valuenow", "12");
  });

  it("steps forward and saves once the clicks stop", async () => {
    const onProgressUpdated = vi.fn();
    renderModal(watchingDrama, { onProgressUpdated });

    const forward = screen.getByLabelText("One episode forward");
    fireEvent.click(forward);
    fireEvent.click(forward);

    // Optimistic: the UI moves immediately, before any request.
    expect(screen.getByLabelText("Episodes watched")).toHaveValue(14);
    expect(updateDrama).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(700);
    });

    // Debounced: two clicks collapse into a single write.
    expect(updateDrama).toHaveBeenCalledTimes(1);
    expect(updateDrama).toHaveBeenCalledWith("drama-1", {
      episodes_watched: 14,
      status: "watching",
    });
    expect(onProgressUpdated).toHaveBeenCalled();
  });

  it("marks the drama watched on the final episode", async () => {
    renderModal({ ...watchingDrama, episodes_watched: 15 });

    fireEvent.click(screen.getByLabelText("One episode forward"));

    await act(async () => {
      vi.advanceTimersByTime(700);
    });

    expect(updateDrama).toHaveBeenCalledWith("drama-1", {
      episodes_watched: 16,
      status: "completed",
    });
    expect(screen.getByText("Finished — marked as watched.")).toBeInTheDocument();
  });

  it("clamps at both ends", () => {
    const { unmount } = renderModal({ ...watchingDrama, episodes_watched: 0 });
    expect(screen.getByLabelText("One episode back")).toBeDisabled();
    expect(screen.getByLabelText("One episode forward")).toBeEnabled();
    unmount();

    renderModal({ ...watchingDrama, episodes_watched: 16 });
    expect(screen.getByLabelText("One episode forward")).toBeDisabled();
    expect(screen.getByLabelText("One episode back")).toBeEnabled();
  });

  it("shows length instead of a tracker once a drama is completed", () => {
    renderModal({ ...watchingDrama, status: "completed", episodes_watched: 16 });

    expect(screen.queryByLabelText("Episodes watched")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("One episode forward")).not.toBeInTheDocument();
    expect(screen.getByText("Length")).toBeInTheDocument();
    expect(screen.getByText("16 episodes")).toBeInTheDocument();
  });

  it("does not nag a completed drama about its episode count", () => {
    renderModal({ ...watchingDrama, status: "completed", total_episodes: null });

    expect(
      screen.queryByText("Add the total episode count under Edit to track your progress.")
    ).not.toBeInTheDocument();
  });

  it("treats a completed drama as fully watched on save", async () => {
    updateDrama.mockResolvedValue({ data: [watchingDrama], error: null });
    renderModal({ ...watchingDrama, status: "completed", episodes_watched: 0 });

    fireEvent.click(screen.getByText("Edit"));

    // The episodes-watched field is not offered for a completed drama.
    expect(screen.queryByLabelText("Episodes watched")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Save changes"));

    await act(async () => {});

    expect(updateDrama).toHaveBeenCalledWith(
      "drama-1",
      expect.objectContaining({ status: "completed", episodes_watched: 16, total_episodes: 16 })
    );
  });

  it("relinks a drama that has no TMDb id, then saves its cast", async () => {
    mockFindShowByTitle.mockResolvedValue({ data: { id: 230923 }, error: null });
    mockGetShowDetails.mockResolvedValue({
      data: {
        id: 230923,
        name: "Dong Yi",
        number_of_episodes: 60,
        credits: { cast: [{ id: 7, name: "Han Hyo-joo", character: "Dong Yi", profile_path: "/f.jpg" }] },
      },
      error: null,
    });
    updateDrama.mockResolvedValue({ data: [watchingDrama], error: null });

    // A legacy drama: watched long ago, never linked to TMDb.
    renderModal({ ...watchingDrama, title: "Dong Yi", tmdb_id: null, main_cast: null });

    fireEvent.click(screen.getByText("Edit"));
    fireEvent.click(screen.getByText("Fetch cast & episodes"));

    await act(async () => {});

    // Looked the title up rather than giving up for want of an id.
    expect(mockFindShowByTitle).toHaveBeenCalledWith("Dong Yi");
    expect(screen.getByText("Han Hyo-joo")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Save changes"));
    await act(async () => {});

    expect(updateDrama).toHaveBeenCalledWith(
      "drama-1",
      expect.objectContaining({
        tmdb_id: "230923",
        total_episodes: 60,
        main_cast: [
          { id: 7, name: "Han Hyo-joo", character: "Dong Yi", profile_path: "/f.jpg" },
        ],
      })
    );
  });

  it("says so plainly when the title cannot be matched", async () => {
    mockFindShowByTitle.mockResolvedValue({ data: null, error: null });

    renderModal({ ...watchingDrama, title: "An Obscure Drama", tmdb_id: null });

    fireEvent.click(screen.getByText("Edit"));
    fireEvent.click(screen.getByText("Fetch cast & episodes"));

    await act(async () => {});

    expect(screen.getByRole("alert")).toHaveTextContent("Could not find");
    expect(mockGetShowDetails).not.toHaveBeenCalled();
  });

  it("explains how to enable tracking when the episode count is unknown", () => {
    renderModal({ ...watchingDrama, total_episodes: null });

    expect(screen.queryByLabelText("Episodes watched")).not.toBeInTheDocument();
    expect(
      screen.getByText("Add the total episode count under Edit to track your progress.")
    ).toBeInTheDocument();
  });

  it("surfaces a migration hint when the column is missing", async () => {
    updateDrama.mockResolvedValue({
      data: null,
      error: { message: 'column "episodes_watched" of relation "dramas" does not exist' },
    });

    renderModal(watchingDrama);
    fireEvent.click(screen.getByLabelText("One episode forward"));

    await act(async () => {
      vi.advanceTimersByTime(700);
    });

    expect(screen.getByRole("alert")).toHaveTextContent("add-episode-tracking.sql");
  });
});

describe("DramaDetailModal watching ratings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateDrama.mockResolvedValue({ data: [{ ...watchingDrama, rating: 7 }], error: null });
  });

  it("shows ten star choices only for dramas being watched", () => {
    const { rerender } = renderModal(watchingDrama);

    expect(screen.getByText("Your rating")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Rate Twinkling Watermelon .* out of 10/ })).toHaveLength(10);
    expect(screen.getByText("Not rated")).toBeInTheDocument();

    rerender(
      <DramaDetailModal
        drama={{ ...watchingDrama, status: "completed" }}
        onUpdated={vi.fn()}
        onProgressUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByText("Your rating")).not.toBeInTheDocument();

    rerender(
      <DramaDetailModal
        drama={{ ...watchingDrama, status: "want_to_watch" }}
        onUpdated={vi.fn()}
        onProgressUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByText("Your rating")).not.toBeInTheDocument();
  });

  it("saves the selected star and updates the value without closing", async () => {
    const onProgressUpdated = vi.fn();
    renderModal(watchingDrama, { onProgressUpdated });

    fireEvent.click(screen.getByRole("button", { name: "Rate Twinkling Watermelon 7 out of 10" }));

    expect(updateDrama).toHaveBeenCalledWith("drama-1", { rating: 7 });
    expect(await screen.findByText("7/10")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Drama details" })).toBeInTheDocument();
    expect(onProgressUpdated).toHaveBeenCalledWith({ ...watchingDrama, rating: 7 });
    expect(screen.getByRole("button", { name: "Rate Twinkling Watermelon 7 out of 10" })).toHaveAttribute("aria-pressed", "true");
  });
});
