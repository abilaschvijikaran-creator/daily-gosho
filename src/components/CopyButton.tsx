import { useEffect, useState } from 'react';
import { copyText } from '../lib/clipboard';

interface CopyButtonProps {
  label: string;
  getText: () => string;
  disabled?: boolean;
}

/** Copies text and announces the result to screen readers (aria-live). */
export function CopyButton({ label, getText, disabled = false }: CopyButtonProps) {
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(''), 3000);
    return () => window.clearTimeout(timer);
  }, [message]);

  async function handleClick() {
    const ok = await copyText(getText());
    setMessage(ok ? 'Copied to clipboard.' : 'Could not copy. Try selecting the text by hand.');
  }

  return (
    <div className="copy-control">
      <button type="button" className="button secondary" onClick={handleClick} disabled={disabled}>
        {label}
      </button>
      <span className="copy-feedback" role="status" aria-live="polite">
        {message}
      </span>
    </div>
  );
}
