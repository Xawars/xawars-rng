import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { OAuthButtonGroup } from "../OAuthButtonGroup";

describe("OAuthButtonGroup", () => {
  const defaultProps = {
    onOAuthClick: vi.fn().mockResolvedValue(undefined),
    loadingProvider: null as 'google' | 'discord' | null,
    disabled: false,
  };

  // Requirement 6.1: Google and Discord buttons with accessible labels
  describe("rendering", () => {
    it("renders a Google button with accessible label", () => {
      render(<OAuthButtonGroup {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: "Continue with Google" })
      ).toBeInTheDocument();
    });

    it("renders a Discord button with accessible label", () => {
      render(<OAuthButtonGroup {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: "Continue with Discord" })
      ).toBeInTheDocument();
    });

    it("renders visible text for both providers", () => {
      render(<OAuthButtonGroup {...defaultProps} />);
      expect(screen.getByText("Continue with Google")).toBeInTheDocument();
      expect(screen.getByText("Continue with Discord")).toBeInTheDocument();
    });
  });

  // Requirement 6.2, 6.3: Click calls onOAuthClick with correct provider
  describe("click handling", () => {
    it("calls onOAuthClick with 'google' when Google button is clicked", () => {
      const onOAuthClick = vi.fn().mockResolvedValue(undefined);
      render(<OAuthButtonGroup {...defaultProps} onOAuthClick={onOAuthClick} />);
      fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
      expect(onOAuthClick).toHaveBeenCalledWith("google");
    });

    it("calls onOAuthClick with 'discord' when Discord button is clicked", () => {
      const onOAuthClick = vi.fn().mockResolvedValue(undefined);
      render(<OAuthButtonGroup {...defaultProps} onOAuthClick={onOAuthClick} />);
      fireEvent.click(screen.getByRole("button", { name: "Continue with Discord" }));
      expect(onOAuthClick).toHaveBeenCalledWith("discord");
    });
  });

  // Requirement 6.6: Loading state disables buttons and shows spinner
  describe("loading state", () => {
    it("disables both buttons when loadingProvider is 'google'", () => {
      render(<OAuthButtonGroup {...defaultProps} loadingProvider="google" />);
      expect(screen.getByRole("button", { name: "Continue with Google" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Continue with Discord" })).toBeDisabled();
    });

    it("disables both buttons when loadingProvider is 'discord'", () => {
      render(<OAuthButtonGroup {...defaultProps} loadingProvider="discord" />);
      expect(screen.getByRole("button", { name: "Continue with Google" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Continue with Discord" })).toBeDisabled();
    });

    it("shows a spinner on the Google button when loadingProvider is 'google'", () => {
      const { container } = render(
        <OAuthButtonGroup {...defaultProps} loadingProvider="google" />
      );
      const googleButton = screen.getByRole("button", { name: "Continue with Google" });
      expect(googleButton.querySelector(".animate-spin")).toBeInTheDocument();
      // Discord button should NOT have a spinner
      const discordButton = screen.getByRole("button", { name: "Continue with Discord" });
      expect(discordButton.querySelector(".animate-spin")).not.toBeInTheDocument();
    });

    it("shows a spinner on the Discord button when loadingProvider is 'discord'", () => {
      render(<OAuthButtonGroup {...defaultProps} loadingProvider="discord" />);
      const discordButton = screen.getByRole("button", { name: "Continue with Discord" });
      expect(discordButton.querySelector(".animate-spin")).toBeInTheDocument();
      // Google button should NOT have a spinner
      const googleButton = screen.getByRole("button", { name: "Continue with Google" });
      expect(googleButton.querySelector(".animate-spin")).not.toBeInTheDocument();
    });

    it("disables both buttons when disabled prop is true", () => {
      render(<OAuthButtonGroup {...defaultProps} disabled={true} />);
      expect(screen.getByRole("button", { name: "Continue with Google" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Continue with Discord" })).toBeDisabled();
    });
  });

  // Requirement 6.5: Divider with "or" text
  describe("divider", () => {
    it("renders a divider with 'or' text", () => {
      render(<OAuthButtonGroup {...defaultProps} />);
      expect(screen.getByText("or")).toBeInTheDocument();
    });
  });
});
