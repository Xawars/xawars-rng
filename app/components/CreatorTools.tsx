import { Copy, Camera, Monitor, Download } from 'lucide-react';
import { Button } from './ui/Button';

interface CreatorToolsProps {
    onCopySummary: () => void;
    onToggleStreamerMode: () => void;
    isStreamerMode: boolean;
    onDownloadThumbnail: () => void;
}

export function CreatorTools({
    onCopySummary,
    onToggleStreamerMode,
    isStreamerMode,
    onDownloadThumbnail
}: CreatorToolsProps) {
    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 p-2 bg-black/50 backdrop-blur-md rounded-lg border border-white/10 transition-opacity hover:opacity-100 opacity-50">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest text-center mb-1">Tools</h3>

            <Button
                variant="ghost"
                size="sm"
                onClick={onCopySummary}
                icon={Copy}
                title="Copy Run Summary to Clipboard"
            >
                <span className="sr-only">Copy Summary</span>
            </Button>

            <Button
                variant="ghost"
                size="sm" // Fix for variant type error from previous context, ideally should be valid if Button serves it
                // actually looking at Button.tsx, variant 'ghost' is valid.
                onClick={onToggleStreamerMode}
                icon={Monitor}
                className={isStreamerMode ? "text-green-400" : ""}
                title="Toggle Streamer Mode (Chroma Key)"
            >
                <span className="sr-only">Streamer Mode</span>
            </Button>

            <Button
                variant="ghost"
                size="sm"
                onClick={onDownloadThumbnail}
                icon={Camera}
                title="Download Thumbnail"
            >
                <span className="sr-only">Download Thumbnail</span>
            </Button>
        </div>
    );
}
