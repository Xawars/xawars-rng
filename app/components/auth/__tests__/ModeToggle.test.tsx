import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ModeToggle } from "../ModeToggle";

describe("ModeToggle", () => {
  it("renders 'Sign up' action when in login mode", () => {
    render(<ModeToggle mode="login" onToggle={vi.fn()} />);
    expect(screen.getByText("Sign up")).toBeInTheDocument();
    expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
  });

  it("renders 'Log in' action when in signup mode", () => {
    render(<ModeToggle mode="signup" onToggle={vi.fn()} />);
    expect(screen.getByText("Log in")).toBeInTheDocument();
    expect(screen.getByText("Already have an account?")).toBeInTheDocument();
  });

  it("calls onToggle when the action button is clicked", () => {
    const onToggle = vi.fn();
    render(<ModeToggle mode="login" onToggle={onToggle} />);
    fireEvent.click(screen.getByText("Sign up"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("visually indicates login mode", () => {
    render(<ModeToggle mode="login" onToggle={vi.fn()} />);
    expect(screen.getByText("Login mode")).toBeInTheDocument();
  });

  it("visually indicates signup mode", () => {
    render(<ModeToggle mode="signup" onToggle={vi.fn()} />);
    expect(screen.getByText("Signup mode")).toBeInTheDocument();
  });

  it("has an accessible label on the toggle button", () => {
    render(<ModeToggle mode="login" onToggle={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Switch to signup mode" })
    ).toBeInTheDocument();
  });

  it("has an accessible label indicating login mode when in signup", () => {
    render(<ModeToggle mode="signup" onToggle={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Switch to login mode" })
    ).toBeInTheDocument();
  });

  it("exposes current mode via data attribute", () => {
    const { container } = render(<ModeToggle mode="login" onToggle={vi.fn()} />);
    expect(container.querySelector('[data-mode="login"]')).toBeInTheDocument();
  });

  it("button has type='button' to prevent form submission", () => {
    render(<ModeToggle mode="login" onToggle={vi.fn()} />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("type", "button");
  });
});
