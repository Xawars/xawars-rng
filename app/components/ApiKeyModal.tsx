'use client';

import { useState, useEffect, useRef } from 'react';
import { Key, ExternalLink, ShieldCheck } from 'lucide-react';
import { PROVIDERS, PROVIDER_ORDER, DEFAULT_PROVIDER, type ProviderId } from '../lib/ai-providers';
import { validateApiKey } from '../lib/ai-client';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string, provider: ProviderId) => void;
  error?: string | null;
  initialProvider?: ProviderId;
}

export function ApiKeyModal({ isOpen, onClose, onSave, error: externalError, initialProvider }: ApiKeyModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>(initialProvider || DEFAULT_PROVIDER);
  const [inputValue, setInputValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Display either internal validation error or external error (e.g., auth failure)
  const displayError = validationError || externalError || null;

  const providerConfig = PROVIDERS[selectedProvider];

  // Sync selectedProvider with initialProvider when it changes
  useEffect(() => {
    if (initialProvider) {
      setSelectedProvider(initialProvider);
    }
  }, [initialProvider]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setInputValue('');
      setValidationError(null);
    }
  }, [isOpen]);

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProvider(e.target.value as ProviderId);
    setInputValue('');
    setValidationError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const result = validateApiKey(selectedProvider, inputValue);
    if (!result.valid) {
      setValidationError(result.error || 'Invalid API key');
      return;
    }

    onSave(inputValue, selectedProvider);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative bg-zinc-900 border border-zinc-700/50 rounded-xl shadow-2xl max-w-[448px] w-full animate-in zoom-in-95 duration-300 slide-in-from-bottom-4">
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center gap-2">
          <Key className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">
            API Key
          </h2>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-zinc-400">
            Enter your API key to generate content ideas.{' '}
            <a
              href={providerConfig.keyHelpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-500 hover:text-yellow-400 inline-flex items-center gap-1"
            >
              Get your API key
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>

          {/* Provider Selector */}
          <div>
            <select
              value={selectedProvider}
              onChange={handleProviderChange}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50"
              aria-label="AI provider"
            >
              {PROVIDER_ORDER.map((id) => (
                <option key={id} value={id}>
                  {PROVIDERS[id].displayName}
                </option>
              ))}
            </select>
          </div>

          {/* API Key Input */}
          <div>
            <input
              ref={inputRef}
              type="password"
              value={inputValue}
              onChange={handleInputChange}
              placeholder={providerConfig.keyPlaceholder}
              maxLength={200}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700/50 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50"
              aria-label="API key"
              aria-invalid={!!displayError}
              aria-describedby={displayError ? 'api-key-error' : undefined}
            />
            {displayError && (
              <p id="api-key-error" className="mt-2 text-sm text-red-400" role="alert">
                {displayError}
              </p>
            )}
          </div>

          {/* Security notice */}
          <div className="flex items-start gap-2 text-xs text-zinc-500">
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Your key is stored locally in your browser</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700/50 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-yellow-500 rounded-lg text-black font-bold hover:bg-yellow-400 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
