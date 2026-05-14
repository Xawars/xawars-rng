import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ApiKeyModal } from "../ApiKeyModal";
import { type ProviderId } from "../../lib/ai-providers";

describe("ApiKeyModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
  };

  function renderModal(overrides: Partial<typeof defaultProps & { error?: string | null; initialProvider?: ProviderId }> = {}) {
    const props = { ...defaultProps, ...overrides };
    return render(<ApiKeyModal {...props} />);
  }

  it("does not render when isOpen is false", () => {
    renderModal({ isOpen: false });
    expect(screen.queryByLabelText("API key")).not.toBeInTheDocument();
  });

  it("renders password input with placeholder 'sk-...' when open (default OpenAI)", () => {
    renderModal();
    const input = screen.getByLabelText("API key");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveAttribute("placeholder", "sk-...");
  });

  it("renders provider selector with OpenAI selected by default", () => {
    renderModal();
    const select = screen.getByLabelText("AI provider") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe("openai");
  });

  it("renders all three provider options in correct order", () => {
    renderModal();
    const select = screen.getByLabelText("AI provider");
    const options = select.querySelectorAll("option");
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveValue("openai");
    expect(options[0]).toHaveTextContent("OpenAI");
    expect(options[1]).toHaveValue("openrouter");
    expect(options[1]).toHaveTextContent("OpenRouter");
    expect(options[2]).toHaveValue("gemini");
    expect(options[2]).toHaveTextContent("Gemini");
  });

  it("uses initialProvider prop as default selection", () => {
    renderModal({ initialProvider: "gemini" } as any);
    const select = screen.getByLabelText("AI provider") as HTMLSelectElement;
    expect(select.value).toBe("gemini");
  });

  it("updates placeholder when provider changes to OpenRouter", () => {
    renderModal();
    const select = screen.getByLabelText("AI provider");
    fireEvent.change(select, { target: { value: "openrouter" } });
    const input = screen.getByLabelText("API key");
    expect(input).toHaveAttribute("placeholder", "sk-or-...");
  });

  it("updates placeholder when provider changes to Gemini", () => {
    renderModal();
    const select = screen.getByLabelText("AI provider");
    fireEvent.change(select, { target: { value: "gemini" } });
    const input = screen.getByLabelText("API key");
    expect(input).toHaveAttribute("placeholder", "AI...");
  });

  it('shows "Invalid API key format. Must start with sk-" when submitting a key without "sk-" prefix (OpenAI)', () => {
    renderModal();
    const input = screen.getByLabelText("API key");
    const form = input.closest("form")!;

    fireEvent.change(input, { target: { value: "invalid-key-without-prefix" } });
    fireEvent.submit(form);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Invalid API key format. Must start with sk-"
    );
  });

  it('shows "API key too short" when submitting a key starting with "sk-" but shorter than 20 chars', () => {
    renderModal();
    const input = screen.getByLabelText("API key");
    const form = input.closest("form")!;

    fireEvent.change(input, { target: { value: "sk-short" } });
    fireEvent.submit(form);

    expect(screen.getByRole("alert")).toHaveTextContent("API key too short");
  });

  it('shows OpenRouter validation error for invalid OpenRouter key', () => {
    renderModal();
    const select = screen.getByLabelText("AI provider");
    fireEvent.change(select, { target: { value: "openrouter" } });

    const input = screen.getByLabelText("API key");
    const form = input.closest("form")!;

    fireEvent.change(input, { target: { value: "invalid-key" } });
    fireEvent.submit(form);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Invalid API key format. Must start with sk-or-"
    );
  });

  it('shows Gemini validation error for short Gemini key', () => {
    renderModal();
    const select = screen.getByLabelText("AI provider");
    fireEvent.change(select, { target: { value: "gemini" } });

    const input = screen.getByLabelText("API key");
    const form = input.closest("form")!;

    fireEvent.change(input, { target: { value: "short" } });
    fireEvent.submit(form);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Invalid API key. Must be at least 10 characters"
    );
  });

  it("clears validation error when user modifies input", () => {
    renderModal();
    const input = screen.getByLabelText("API key");
    const form = input.closest("form")!;

    // Trigger a validation error
    fireEvent.change(input, { target: { value: "bad" } });
    fireEvent.submit(form);
    expect(screen.getByRole("alert")).toBeInTheDocument();

    // Modify input — error should clear
    fireEvent.change(input, { target: { value: "b" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("clears validation error and input when provider changes", () => {
    renderModal();
    const input = screen.getByLabelText("API key") as HTMLInputElement;
    const form = input.closest("form")!;
    const select = screen.getByLabelText("AI provider");

    // Enter a value and trigger a validation error
    fireEvent.change(input, { target: { value: "bad" } });
    fireEvent.submit(form);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(input.value).toBe("bad");

    // Change provider — error and input should clear
    fireEvent.change(select, { target: { value: "gemini" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(input.value).toBe("");
  });

  it("calls onClose when Cancel is clicked without calling onSave", () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    renderModal({ onClose, onSave });

    fireEvent.click(screen.getByText("Cancel"));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('calls onSave with the valid key and provider when submitting a valid OpenAI key', () => {
    const onSave = vi.fn();
    renderModal({ onSave });
    const input = screen.getByLabelText("API key");
    const form = input.closest("form")!;

    const validKey = "sk-1234567890abcdefgh";
    fireEvent.change(input, { target: { value: validKey } });
    fireEvent.submit(form);

    expect(onSave).toHaveBeenCalledWith(validKey, "openai");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it('calls onSave with the valid key and provider when submitting a valid Gemini key', () => {
    const onSave = vi.fn();
    renderModal({ onSave });
    const select = screen.getByLabelText("AI provider");
    fireEvent.change(select, { target: { value: "gemini" } });

    const input = screen.getByLabelText("API key");
    const form = input.closest("form")!;

    const validKey = "AIzaSyAbcdefgh";
    fireEvent.change(input, { target: { value: validKey } });
    fireEvent.submit(form);

    expect(onSave).toHaveBeenCalledWith(validKey, "gemini");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("displays external error prop", () => {
    renderModal({ error: "API key is invalid. Please re-enter." } as any);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "API key is invalid. Please re-enter."
    );
  });

  it("closes on Escape key press", () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("displays help link for OpenRouter provider", () => {
    renderModal();
    const select = screen.getByLabelText("AI provider");
    fireEvent.change(select, { target: { value: "openrouter" } });

    const link = screen.getByText("Get your API key");
    expect(link).toHaveAttribute("href", "https://openrouter.ai/keys");
  });

  it("displays help link for Gemini provider", () => {
    renderModal();
    const select = screen.getByLabelText("AI provider");
    fireEvent.change(select, { target: { value: "gemini" } });

    const link = screen.getByText("Get your API key");
    expect(link).toHaveAttribute("href", "https://aistudio.google.com/apikey");
  });
});
