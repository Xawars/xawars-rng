import { render, cleanup } from "@testing-library/react";
import fc from "fast-check";
import { vi, beforeEach, afterEach } from "vitest";
import { ContentGeneratorModal } from "../ContentGeneratorModal";

describe("Feature: ai-content-generator, Property 8: ContentIdea state retention across modal close/reopen", () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    cleanup();
  });

  // Generate safe alphanumeric strings without leading/trailing whitespace
  const safeString = (prefix: string) =>
    fc.stringMatching(/^[a-zA-Z0-9]{1,20}$/).map(
      (s) => `${prefix}_${s}`
    );

  const contentIdeaArb = fc.record({
    contentIdea: safeString("idea"),
    titleVariations: fc.tuple(
      safeString("title1"),
      safeString("title2"),
      safeString("title3")
    ),
    storyHook: safeString("hook"),
    missionDirective: safeString("mission"),
    thumbnailPrompts: fc.tuple(
      safeString("thumb1"),
      safeString("thumb2"),
      safeString("thumb3")
    ),
  });

  const defaultProps = {
    onClose: vi.fn(),
    isGenerating: false,
    error: null,
    onGenerate: vi.fn(),
    onClearApiKey: vi.fn(),
    activeProvider: 'openai' as const,
    onChangeProvider: vi.fn(),
  };

  it("retains the same ContentIdea after modal close and reopen", { timeout: 30000 }, () => {
    /**
     * Validates: Requirements 8.5
     *
     * Property 8: For any valid ContentIdea object stored in component state,
     * closing the ContentGeneratorModal and reopening it (without triggering a
     * new generation) yields the same ContentIdea object with all fields unchanged.
     *
     * This validates the parent state management pattern: page.tsx holds currentIdea
     * in state and passes it as a prop. Closing and reopening the modal with the
     * same idea prop should render identical content.
     */
    fc.assert(
      fc.property(contentIdeaArb, (idea) => {
        // Clean up any previous renders to avoid cross-iteration DOM pollution
        cleanup();

        // Create a dedicated container for this iteration
        const container = document.createElement("div");
        document.body.appendChild(container);

        try {
          // Simulate parent state: parent holds `idea` and passes it to the modal
          // Render with modal open and the generated idea
          const { rerender } = render(
            <ContentGeneratorModal {...defaultProps} isOpen={true} idea={idea} />,
            { container }
          );

          // Capture the rendered HTML when modal is open
          const htmlBeforeClose = container.innerHTML;

          // Verify content is actually rendered (not empty)
          expect(htmlBeforeClose).toContain(idea.contentIdea);
          expect(htmlBeforeClose).toContain(idea.storyHook);
          expect(htmlBeforeClose).toContain(idea.missionDirective);
          for (const title of idea.titleVariations) {
            expect(htmlBeforeClose).toContain(title);
          }
          for (const prompt of idea.thumbnailPrompts) {
            expect(htmlBeforeClose).toContain(prompt);
          }

          // Close the modal (parent sets isOpen=false, but retains idea in state)
          rerender(
            <ContentGeneratorModal {...defaultProps} isOpen={false} idea={idea} />
          );

          // Modal returns null when closed - content should not be in the DOM
          expect(container.innerHTML).not.toContain(idea.contentIdea);

          // Reopen the modal with the same idea (parent passes same idea prop)
          rerender(
            <ContentGeneratorModal {...defaultProps} isOpen={true} idea={idea} />
          );

          // Capture the rendered HTML after reopen
          const htmlAfterReopen = container.innerHTML;

          // The key property: rendered content is identical before close and after reopen
          expect(htmlAfterReopen).toBe(htmlBeforeClose);
        } finally {
          cleanup();
          if (container.parentNode) {
            document.body.removeChild(container);
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});
