import type { Reflection } from '../reflection/engine';

interface ReflectionCardProps {
  reflection: Reflection;
  basisLabel: string;
}

/** Sections 3–6 of the daily reading. Clearly labelled as a template-based reflection. */
export function ReflectionCard({ reflection, basisLabel }: ReflectionCardProps) {
  return (
    <section className="card reflection" aria-labelledby="reflection-heading">
      <h2 id="reflection-heading">Reflection</h2>
      <p className="note">
        <strong>{reflection.label}.</strong> Based on {basisLabel}. The explanation and application are our
        interpretation, not the author’s words.
      </p>
      {reflection.limitedFallback && (
        <p className="note warning">Limited fallback: no built-in theme matched this passage.</p>
      )}
      <p className="small muted">Theme: {reflection.themeLabel}</p>

      <h3>3. What this guidance means in plain English</h3>
      <p>{reflection.explanation}</p>

      <h3>4. What this means personally for me today</h3>
      <p>{reflection.application}</p>

      <h3>5. My determination today</h3>
      <p className="determination">{reflection.determination}</p>
      <p className="small muted">A personal reflection, not a Buddhist quotation.</p>

      <h3>6. My practical action today</h3>
      <p>{reflection.action}</p>
    </section>
  );
}
