import JSZip from 'jszip';
import type { DesignDocument, GeneratedSite } from '../types/design';
import { compileDocument } from './codegen';

// Real ZIP export: runnable static website + README.

export async function exportSiteZip(doc: DesignDocument, site: GeneratedSite | null): Promise<Blob> {
  const compiled = compileDocument(doc, { engine: site?.engine ?? 'local' });
  const zip = new JSZip();
  const folder = zip.folder(slugify(doc.name)) ?? zip;

  folder.file('index.html', compiled.fullHtml);
  folder.file('styles.css', compiled.css);
  folder.file('script.js', compiled.js);
  folder.file('design.sitecraft.json', JSON.stringify(doc, null, 2));

  folder.file(
    'README.md',
    `# ${doc.name}

Generated with **SITECRAFT** — Design once. Build instantly.

- Engine: ${site?.engine === 'deepseek' ? 'DeepSeek AI' : 'SITECRAFT Local Engine'}
- Generated: ${new Date().toISOString()}

## Run

Open \`index.html\` directly in a browser, or serve the folder:

\`\`\`bash
npx serve .
# or
python -m http.server 8080
\`\`\`

## Files

| File | Purpose |
| --- | --- |
| \`index.html\` | Page markup |
| \`styles.css\` | All styles incl. responsive rules |
| \`script.js\` | Interactions (scroll, reveals) |
| \`design.sitecraft.json\` | Source design document — import it back into SITECRAFT |
`,
  );

  return zip.generateAsync({ type: 'blob' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function slugify(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'sitecraft-site';
}
