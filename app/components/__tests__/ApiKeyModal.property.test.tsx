import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import fc from "fast-check";
import { describe, it, expect, vi } from "vitest";
import { ApiKeyModal } from "../ApiKeyModal";

describe("Feature: multi-provider-support, Property 2: Provider change clears validation state", () => {
  /**
   * Validates: Requirements 2.7
   *
   * Property 2: For any current provider selection and for any different target
   * provider, switching the provider in the selector SHALL result in the validation
   * error being cleared and the input field being empty.
   */
  it("switching provider clears validation error and empties input field for any provider transition", { timeout: 30000 }, () => {
    const providers = ["openai", "openrouter", "gemini"] as const;

    // Generate pairs of different providers
    const providerPairArb = fc
      .record({
        source: fc.constantFrom(...providers),
        target: fc.constantFrom(...providers),
      })
      .filter(({ source, target }) => source !== target);

    fc.assert(
      fc.property(providerPairArb, ({ source, target }) => {
        cleanup();

        const onSave = vi.fn();
        const onClose = vi.fn();

        render(
          <ApiKeyModal
            isOpen={true}
            onClose={onClose}
            onSave={onSave}
            initialProvider={source}
          />
        );

        // Verify the provider selector is set to the source provider
        const select = screen.getByLabelText("AI provider") as HTMLSelectElement;
        expect(select.value).toBe(source);

        // Enter some text in the input field
        const input = screen.getByLabelText("API key") as HTMLInputElement;
        fireEvent.change(input, { target: { value: "invalid" } });

        // Submit the form to trigger a validation error
        const form = input.closest("form")!;
        fireEvent.submit(form);

        // Verify the error is displayed
        expect(screen.getByRole("alert")).toBeInTheDocument();

        // Change the provider selector to the target provider
        fireEvent.change(select, { target: { value: target } });

        // Verify: no error is displayed
        expect(screen.queryByRole("alert")).toBeNull();

        // Verify: input field value is empty string
        expect(input.value).toBe("");

        cleanup();
      }),
      { numRuns: 100 }
    );
  });
});
