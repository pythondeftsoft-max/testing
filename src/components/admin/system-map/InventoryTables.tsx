import {
  frontendNodes,
  databaseNodes,
  edgeFunctionGroups,
  externalNodes,
  infraNodes,
  workflows,
  ARCHITECTURE_VERSION,
  ARCHITECTURE_LAST_UPDATED,
} from '@/data/systemArchitecture';

/**
 * Renders the full system inventory as static HTML tables.
 * Used both in the Admin tab (visual reference) and as the source
 * for the PDF export.
 */
export function InventoryTables() {
  return (
    <div className="space-y-8 text-sm">
      <header className="border-b pb-4">
        <h1 className="text-3xl font-bold">OpenKey System Architecture</h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive inventory of all portals, databases, edge functions, and integrations.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Version {ARCHITECTURE_VERSION} · Last updated {ARCHITECTURE_LAST_UPDATED}
        </p>
      </header>

      {/* Section A: Tech Stack */}
      <section>
        <h2 className="text-2xl font-semibold mb-3">A. Tech Stack</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Frontend:</strong> React 18, Vite 5, TypeScript 5, Tailwind CSS v3, shadcn/ui</li>
          <li><strong>Backend:</strong> Supabase (Postgres, Auth, Storage, Edge Functions on Deno)</li>
          <li><strong>State:</strong> React Query (@tanstack/react-query)</li>
          <li><strong>Routing:</strong> React Router v6</li>
          <li><strong>Deployment:</strong> Lovable Cloud + custom domain (openkeyhousing.com)</li>
        </ul>
      </section>

      {/* Section B: Frontend Portals */}
      <Section title="B. Frontend Portals" nodes={frontendNodes} columns={['label', 'description', 'files']} />

      {/* Section C: Database Domains */}
      <Section title="C. Database Domains" nodes={databaseNodes} columns={['label', 'description', 'tables']} />

      {/* Section D: Edge Functions (grouped) */}
      <Section title="D. Edge Functions (by group)" nodes={edgeFunctionGroups} columns={['label', 'description', 'files', 'secrets']} />

      {/* Section E: External Integrations */}
      <Section title="E. External Integrations" nodes={externalNodes} columns={['label', 'description', 'secrets']} />

      {/* Section F: Supabase Infrastructure */}
      <Section title="F. Supabase Infrastructure" nodes={infraNodes} columns={['label', 'description']} />

      {/* Section G: Key Workflows */}
      <section>
        <h2 className="text-2xl font-semibold mb-3">G. Key Workflows</h2>
        <div className="space-y-4">
          {workflows.map((wf) => (
            <div key={wf.id} className="border rounded-lg p-4">
              <h3 className="font-semibold">{wf.name}</h3>
              <p className="text-muted-foreground mt-1">{wf.description}</p>
              <div className="mt-2 text-xs">
                <strong>Flow:</strong> {wf.steps.join(' → ')}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section H: Security & Conventions */}
      <section>
        <h2 className="text-2xl font-semibold mb-3">H. Security & Conventions</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>RLS patterns:</strong> <code>has_role()</code>, <code>is_agency_staff()</code>, <code>is_admin()</code> as SECURITY DEFINER functions to avoid recursion.</li>
          <li><strong>Roles:</strong> stored in <code>account_roles</code> + <code>agency_staff</code>. NEVER on profiles table.</li>
          <li><strong>Storage:</strong> path-based folder ownership (<code>{`{user_id}/...`}</code>) for documents and inspection-photos buckets.</li>
          <li><strong>PII minimization:</strong> verification flags instead of storing full SSN/DOB.</li>
          <li><strong>Edge function errors:</strong> always HTTP 200 with <code>{`{ success: false, error: "..." }`}</code> body.</li>
          <li><strong>Batch fetching:</strong> 1000-row PostgREST limit bypass — see mem://technical/supabase/batch-fetching-standard.</li>
          <li><strong>SMS constraint:</strong> Quo API allows max 1 recipient per send call.</li>
        </ul>
      </section>
    </div>
  );
}

function Section({
  title,
  nodes,
  columns,
}: {
  title: string;
  nodes: any[];
  columns: string[];
}) {
  return (
    <section>
      <h2 className="text-2xl font-semibold mb-3">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-muted">
              {columns.map((c) => (
                <th key={c} className="text-left p-2 border capitalize">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nodes.map((n) => (
              <tr key={n.id} className="border-b align-top">
                {columns.map((c) => (
                  <td key={c} className="p-2 border">
                    {Array.isArray(n[c]) ? (
                      <div className="font-mono text-[10px] leading-relaxed">
                        {n[c].slice(0, 30).join(', ')}
                        {n[c].length > 30 && ` …(+${n[c].length - 30} more)`}
                      </div>
                    ) : (
                      n[c] ?? '—'
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
