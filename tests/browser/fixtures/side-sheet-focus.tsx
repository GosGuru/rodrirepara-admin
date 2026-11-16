import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SideSheet } from '../../../src/components/SideSheet';

function FocusFixture() {
  const [open, setOpen] = useState(false);
  const [hasOrigin, setHasOrigin] = useState(true);
  const [status, setStatus] = useState('Ready');
  return <main>
    <h1>Focus regression fixture</h1>
    <p role="status" tabIndex={-1}>{status}</p>
    {hasOrigin && <button type="button" onClick={() => setOpen(true)}>Open details</button>}
    <SideSheet open={open} titleId="focus-title" header={<h2 id="focus-title">Details</h2>}
      onRequestClose={() => setOpen(false)}
      footer={<>
        <button type="button" onClick={() => setOpen(false)}>Close details</button>
        <button type="button" onClick={() => { setHasOrigin(false); setStatus('Operation completed'); setOpen(false); }}>Complete and remove origin</button>
      </>}>
      <p>Only the public controlled SideSheet API is exercised.</p>
    </SideSheet>
  </main>;
}
createRoot(document.getElementById('root')!).render(<FocusFixture />);
