import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FloatingGeneratorButton } from "../FloatingGeneratorButton";

describe("FloatingGeneratorButton", () => {
  it("renders as a button element (keyboard reachable by default)", () => {
    render(<FloatingGeneratorButton onClick={() => {}} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("has aria-label 'Generate AI content'", () => {
    render(<FloatingGeneratorButton onClick={() => {}} />);
    expect(
      screen.getByRole("button", { name: "Generate AI content" })
    ).toBeInTheDocument();
  });

  it("renders with fixed positioning classes (fixed, bottom-6, right-6)", () => {
    render(<FloatingGeneratorButton onClick={() => {}} />);
    const button = screen.getByRole("button");
    expect(button.className).toContain("fixed");
    expect(button.className).toContain("bottom-6");
    expect(button.className).toContain("right-6");
  });

  it("has z-40 class", () => {
    render(<FloatingGeneratorButton onClick={() => {}} />);
    const button = screen.getByRole("button");
    expect(button.className).toContain("z-40");
  });

  it("has hover:scale-105 and active:scale-95 classes", () => {
    render(<FloatingGeneratorButton onClick={() => {}} />);
    const button = screen.getByRole("button");
    expect(button.className).toContain("hover:scale-105");
    expect(button.className).toContain("active:scale-95");
  });

  it("has yellow-500 background, rounded-full, and shadow-lg classes", () => {
    render(<FloatingGeneratorButton onClick={() => {}} />);
    const button = screen.getByRole("button");
    expect(button.className).toContain("bg-yellow-500");
    expect(button.className).toContain("rounded-full");
    expect(button.className).toContain("shadow-lg");
  });

  it("calls onClick when clicked", () => {
    const handleClick = vi.fn();
    render(<FloatingGeneratorButton onClick={handleClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("renders Sparkles icon and 'Generate' text", () => {
    render(<FloatingGeneratorButton onClick={() => {}} />);
    expect(screen.getByText("Generate")).toBeInTheDocument();
    // Sparkles icon renders as an SVG element inside the button
    const button = screen.getByRole("button");
    const svg = button.querySelector("svg");
    expect(svg).not.toBeNull();
  });
});
