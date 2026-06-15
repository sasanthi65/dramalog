import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DramaDetailModal from "./DramaDetailModal_UPGRADED";
import { deleteDrama, updateDrama } from "../lib/supabase";

vi.mock("../lib/supabase", () => ({
  deleteDrama: vi.fn(),
  updateDrama: vi.fn(),
}));

const drama = {
  id: "drama-1",
  title: "Crash Landing on You",
  poster_url: "https://example.com/poster.jpg",
  synopsis: "A romance across borders.",
  genres: ["Drama", "Romance"],
  year_released: 2019,
  status: "completed",
  year_watched: "2024",
  rating: 9,
  review: "Comfort watch.",
};

describe("DramaDetailModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
  });

  it("renders drama details and closes from the header button", () => {
    const onClose = vi.fn();

    render(
      <DramaDetailModal
        drama={drama}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onClose={onClose}
      />
    );

    expect(screen.getByRole("heading", { name: drama.title })).toBeInTheDocument();
    expect(screen.getByText("Released: 2019")).toBeInTheDocument();
    expect(screen.getByText("Drama, Romance")).toBeInTheDocument();
    expect(screen.getByText("Comfort watch.")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Close drama detail modal"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("updates a drama with normalized form values", async () => {
    const onUpdated = vi.fn();
    const updatedDrama = { ...drama, title: "Queen of Tears", rating: 10 };
    updateDrama.mockResolvedValue({ data: [updatedDrama], error: null });

    render(
      <DramaDetailModal
        drama={drama}
        onUpdated={onUpdated}
        onDeleted={vi.fn()}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText("Edit"));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Queen of Tears" },
    });
    fireEvent.change(screen.getByLabelText("Rating (1-10)"), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByText("Save changes"));

    await waitFor(() => {
      expect(updateDrama).toHaveBeenCalledWith(
        "drama-1",
        expect.objectContaining({
          title: "Queen of Tears",
          rating: 10,
          year_released: 2019,
          genres: ["Drama", "Romance"],
        })
      );
    });
    expect(onUpdated).toHaveBeenCalledWith(updatedDrama);
  });

  it("deletes a drama after confirmation", async () => {
    const onDeleted = vi.fn();
    deleteDrama.mockResolvedValue({ error: null });

    render(
      <DramaDetailModal
        drama={drama}
        onUpdated={vi.fn()}
        onDeleted={onDeleted}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(deleteDrama).toHaveBeenCalledWith("drama-1");
    });
    expect(onDeleted).toHaveBeenCalledWith("drama-1");
  });
});
