import type React from 'react';

export default function Page(): React.ReactElement {
  return (
    <main data-testid="phase-0-home">
      <section>
        <h1>Anonym Messenger</h1>
        <p>Phase 0 — Foundation. No user-facing features are enabled.</p>
        <ul>
          <li>
            Security &gt; Anonymity &gt; Architecture &gt; Sustainability &gt; Performance &gt; UX
          </li>
          <li>No identity, no messaging, no monetization wired yet.</li>
          <li>See docs/ in the repository root.</li>
        </ul>
      </section>
    </main>
  );
}
