import {
  frontendNodes,
  databaseNodes,
  edgeFunctionGroups,
  externalNodes,
  infraNodes,
  workflows,
  ARCHITECTURE_VERSION,
  ARCHITECTURE_LAST_UPDATED,
  type SystemNode,
} from '@/data/systemArchitecture';
import { generatePDF } from '@/utils/pdfGenerator';

/**
 * Builds the full inventory as printable HTML and triggers PDF export.
 * Output: openkey-system-map-{YYYY-MM-DD}.pdf
 */
export async function exportSystemMapPDF() {
  const today = new Date().toISOString().slice(0, 10);
  const filename = `openkey-system-map-${today}.pdf`;

  const html = buildHTML();

  await generatePDF.generatePDFFromHTML(html, {
    filename,
    headerText: 'OpenKey System Architecture',
    footerText: `v${ARCHITECTURE_VERSION} · Generated ${today}`,
    pageBreaks: true,
    quality: 1.0,
  });
}

function buildHTML(): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a;">
      ${header()}
      ${techStack()}
      ${nodeSection('B. Frontend Portals', frontendNodes, ['label', 'description', 'files', 'tables'])}
      ${nodeSection('C. Database Domains', databaseNodes, ['label', 'description', 'tables'])}
      ${nodeSection('D. Edge Functions (by group)', edgeFunctionGroups, ['label', 'description', 'files', 'secrets'])}
      ${nodeSection('E. External Integrations', externalNodes, ['label', 'description', 'secrets', 'url'])}
      ${nodeSection('F. Supabase Infrastructure', infraNodes, ['label', 'description'])}
      ${workflowsSection()}
      ${securitySection()}
    </div>
  `;
}

function header(): string {
  return `
    <div style="border-bottom: 2px solid #1a1a1a; padding-bottom: 16px; margin-bottom: 24px;">
      <h1 style="font-size: 28px; margin: 0;">OpenKey System Architecture</h1>
      <p style="color: #555; margin: 8px 0 0;">Developer onboarding reference — full inventory of portals, databases, edge functions, and integrations.</p>
      <p style="color: #888; font-size: 11px; margin: 4px 0 0;">Version ${ARCHITECTURE_VERSION} · Last updated ${ARCHITECTURE_LAST_UPDATED}</p>
    </div>
  `;
}

function techStack(): string {
  return `
    <section style="margin-bottom: 28px;">
      <h2 style="font-size: 18px; border-bottom: 1px solid #ddd; padding-bottom: 4px;">A. Tech Stack</h2>
      <ul style="line-height: 1.6; padding-left: 20px;">
        <li><b>Frontend:</b> React 18, Vite 5, TypeScript 5, Tailwind CSS v3, shadcn/ui</li>
        <li><b>Backend:</b> Supabase (Postgres, Auth, Storage, Edge Functions on Deno)</li>
        <li><b>State:</b> React Query (@tanstack/react-query)</li>
        <li><b>Routing:</b> React Router v6</li>
        <li><b>Deployment:</b> Lovable Cloud + custom domain (openkeyhousing.com)</li>
      </ul>
    </section>
  `;
}

function nodeSection(title: string, nodes: SystemNode[], cols: string[]): string {
  const rows = nodes.map((n) => {
    const cells = cols.map((c) => {
      const v = (n as any)[c];
      if (Array.isArray(v)) {
        const items = v.slice(0, 25).join(', ');
        const extra = v.length > 25 ? ` …(+${v.length - 25} more)` : '';
        return `<td style="padding:6px;border:1px solid #ddd;font-family:monospace;font-size:9px;vertical-align:top;">${escape(items + extra)}</td>`;
      }
      return `<td style="padding:6px;border:1px solid #ddd;vertical-align:top;font-size:10px;">${escape(v ?? '—')}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  const headers = cols.map((c) => `<th style="padding:6px;border:1px solid #ddd;background:#f4f4f5;text-align:left;font-size:10px;text-transform:capitalize;">${c}</th>`).join('');

  return `
    <section style="margin-bottom: 28px; page-break-inside: avoid;">
      <h2 style="font-size: 18px; border-bottom: 1px solid #ddd; padding-bottom: 4px;">${title}</h2>
      <table style="width:100%;border-collapse:collapse;margin-top:8px;">
        <thead><tr>${headers}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
  `;
}

function workflowsSection(): string {
  const items = workflows.map((wf) => `
    <div style="border:1px solid #ddd;border-radius:6px;padding:12px;margin-bottom:10px;">
      <h3 style="margin:0 0 4px;font-size:13px;">${escape(wf.name)}</h3>
      <p style="color:#555;margin:0 0 6px;font-size:11px;">${escape(wf.description)}</p>
      <div style="font-size:10px;font-family:monospace;color:#666;"><b>Flow:</b> ${wf.steps.join(' → ')}</div>
    </div>
  `).join('');

  return `
    <section style="margin-bottom:28px;">
      <h2 style="font-size:18px;border-bottom:1px solid #ddd;padding-bottom:4px;">G. Key Workflows</h2>
      ${items}
    </section>
  `;
}

function securitySection(): string {
  return `
    <section style="margin-bottom:28px;">
      <h2 style="font-size:18px;border-bottom:1px solid #ddd;padding-bottom:4px;">H. Security & Conventions</h2>
      <ul style="line-height:1.6;padding-left:20px;font-size:11px;">
        <li><b>RLS patterns:</b> has_role(), is_agency_staff(), is_admin() as SECURITY DEFINER functions to avoid recursion.</li>
        <li><b>Roles:</b> stored in account_roles + agency_staff. NEVER on profiles table.</li>
        <li><b>Storage:</b> path-based folder ownership ({user_id}/...) for documents and inspection-photos buckets.</li>
        <li><b>PII minimization:</b> verification flags instead of storing full SSN/DOB.</li>
        <li><b>Edge function errors:</b> always HTTP 200 with { success: false, error: "..." } body.</li>
        <li><b>Batch fetching:</b> 1000-row PostgREST limit bypass — see batch-fetching-standard.</li>
        <li><b>SMS constraint:</b> Quo API allows max 1 recipient per send call.</li>
      </ul>
    </section>
  `;
}

function escape(s: any): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
