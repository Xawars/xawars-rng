import { render, screen, fireEvent, act } from "@testing-library/react";
import fc from "fast-check";
import { vi, beforeEach, afterEach } from "vitest";
import { CopyButton } from "../CopyButton";

describe("Feature: ai-content-generator, Property 7: Copy button preserves text exactly", () => {
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

  it("writes the exact input string to clipboard without any transformation", async () => {
    /**
     * Validates: Requirements 5.2
     *
     * Property 7: For any non-empty string passed to the CopyButton component,
     * when the copy action is triggered, the string written to the clipboard is
     * identical to the input string (no trimming, no transformation).
     */
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1 }), async (text) => {
        writeTextMock.mockClear();

        const { unmount } = render(<CopyButton text={text} />);

        await act(async () => {
          fireEvent.click(screen.getByRole("button"));
        });

        expect(writeTextMock).toHaveBeenCalledTimes(1);
        expect(writeTextMock).toHaveBeenCalledWith(text);

        unmount();
      }),
      { numRuns: 100 }
    );
  });
});
