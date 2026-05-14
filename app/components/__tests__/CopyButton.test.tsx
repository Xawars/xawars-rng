import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CopyButton } from "../CopyButton";

describe("CopyButton", () => {
  let writeTextMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders default state with clipboard icon and Copy label", () => {
    render(<CopyButton text="hello" />);
    expect(screen.getByText("Copy")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("renders custom label when provided", () => {
    render(<CopyButton text="hello" label="Copy All" />);
    expect(screen.getByText("Copy All")).toBeInTheDocument();
  });

  it("copies text to clipboard on click", async () => {
    render(<CopyButton text="test content" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });
    expect(writeTextMock).toHaveBeenCalledWith("test content");
  });

  it("shows Copied! state for 2 seconds after successful copy", async () => {
    render(<CopyButton text="hello" />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(screen.getByText("Copied!")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText("Copy")).toBeInTheDocument();
  });

  it("stays in default state when clipboard write fails", async () => {
    writeTextMock.mockRejectedValue(new Error("Clipboard unavailable"));

    render(<CopyButton text="hello" />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(screen.getByText("Copy")).toBeInTheDocument();
    expect(screen.queryByText("Copied!")).not.toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<CopyButton text="hello" className="ml-2" />);
    const button = screen.getByRole("button");
    expect(button.className).toContain("ml-2");
  });

  it("uses green text color in copied state", async () => {
    render(<CopyButton text="hello" />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    const button = screen.getByRole("button");
    expect(button.className).toContain("text-green-400");
  });
});
