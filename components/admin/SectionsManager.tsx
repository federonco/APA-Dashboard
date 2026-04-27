"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useState, type ReactNode } from "react";
import { tokens } from "@/lib/designTokens";

export type SubsectionListRow = {
  id: string;
  name: string;
  section_id: string;
  app_id: string;
  start_ch: number | null;
  end_ch: number | null;
  direction: string | null;
  is_active: boolean;
};

export type SectionListRow = {
  id: string;
  name: string;
  scope: string | null;
  app_id: string | null;
  start_ch: number | null;
  end_ch: number | null;
  direction: string | null;
  crew_id: string | null;
  project_id?: string | null;
  is_active: boolean;
  show_in_portfolio?: boolean;
  crew_name: string | null;
  admin_count: number;
  subsections: SubsectionListRow[];
};

type CrewOpt = { id: string; name: string };

type PanelState =
  | { mode: "none" }
  | { mode: "create-section" }
  | { mode: "edit-section"; section: SectionListRow }
  | { mode: "create-sub"; sectionId: string; sectionName: string }
  | { mode: "edit-sub"; sub: SubsectionListRow; sectionName: string };

const accent = "#B96A2D";
const border = "#EEECEF";
const textMuted = "#71717a";

function chainageLabel(s: {
  start_ch: number | null;
  end_ch: number | null;
  direction: string | null;
}): string {
  if (s.start_ch == null && s.end_ch == null) return "—";
  const a = s.start_ch ?? "—";
  const b = s.end_ch ?? "—";
  const d = s.direction ? ` (${s.direction})` : "";
  return `${a} – ${b}${d}`;
}

export function SectionsManager() {
  const [rows, setRows] = useState<SectionListRow[]>([]);
  const [crews, setCrews] = useState<CrewOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelState>({ mode: "none" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [secRes, crewRes] = await Promise.all([
        fetch("/api/admin/sections?include_inactive=1"),
        fetch("/api/admin/crews"),
      ]);
      if (!secRes.ok) {
        const d = (await secRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(d?.error ?? "Failed to load sections");
      }
      if (!crewRes.ok) {
        const d = (await crewRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(d?.error ?? "Failed to load crews");
      }
      setRows((await secRes.json()) as SectionListRow[]);
      setCrews((await crewRes.json()) as CrewOpt[]);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const closePanel = () => {
    setPanel({ mode: "none" });
    setFormError(null);
  };

  return (
    <div
      className="relative overflow-hidden rounded-lg border"
      style={{ background: "#FCFBFB", borderColor: tokens.theme.border }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3"
        style={{ borderColor: border }}
      >
        <h2 className="font-medium uppercase tracking-wide" style={{ fontSize: "13px", color: "#52525b" }}>
          Sections manager
        </h2>
        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setPanel({ mode: "create-section" });
          }}
          className="rounded border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[#fafafa]"
          style={{ borderColor: border, color: accent }}
        >
          + New section
        </button>
      </div>

      {loadError && (
        <div className="px-5 py-3 text-sm" style={{ color: "#b91c1c" }}>
          {loadError}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm" style={{ color: "#3f3f46" }}>
          <thead>
            <tr style={{ background: "#F7F7F7", borderBottom: `1px solid ${tokens.theme.border}` }}>
              {["Name", "Scope", "App", "Crew", "Portfolio", "Admins", "Chainage", "Actions"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-[11px] font-medium uppercase"
                  style={{ color: textMuted }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-sm" style={{ color: textMuted }}>
                  Loading…
                </td>
              </tr>
            ) : (
              rows.map((s) => {
                const inactive = s.is_active === false;
                return (
                  <Fragment key={s.id}>
                    <tr
                      className="border-b transition-colors hover:bg-[#fafafa]"
                      style={{ borderColor: border, opacity: inactive ? 0.65 : 1 }}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/sections/${s.id}`}
                          className="font-medium hover:underline"
                          style={{ color: accent }}
                        >
                          {s.name}
                        </Link>
                        {inactive && (
                          <span className="ml-2 text-[10px] uppercase" style={{ color: textMuted }}>
                            (inactive)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">{s.scope ?? "—"}</td>
                      <td className="px-4 py-3 text-xs">{s.app_id ?? "—"}</td>
                      <td className="px-4 py-3 text-xs">{s.crew_name ?? "—"}</td>
                      <td className="px-4 py-3 text-xs">{s.show_in_portfolio === false ? "Hidden" : "Visible"}</td>
                      <td className="px-4 py-3 text-xs">{s.admin_count}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: textMuted }}>
                        {chainageLabel(s)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        <button
                          type="button"
                          className="mr-2 rounded border px-2 py-1 hover:bg-[#fafafa]"
                          style={{ borderColor: border, color: "#52525b" }}
                          onClick={() => {
                            setFormError(null);
                            setPanel({ mode: "edit-section", section: s });
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="rounded border px-2 py-1 hover:bg-[#fafafa]"
                          style={{ borderColor: border, color: accent }}
                          onClick={() => {
                            setFormError(null);
                            setPanel({ mode: "create-sub", sectionId: s.id, sectionName: s.name });
                          }}
                        >
                          + Subsection
                        </button>
                      </td>
                    </tr>
                    {s.subsections.map((sub) => {
                      const subInact = sub.is_active === false;
                      return (
                        <tr
                          key={sub.id}
                          className="border-b bg-[#fafafa]/80 transition-colors hover:bg-[#f4f4f5]"
                          style={{ borderColor: border, opacity: subInact ? 0.65 : 1 }}
                        >
                          <td className="px-4 py-2 pl-8 text-xs" style={{ color: "#52525b" }}>
                            <span className="mr-1 select-none text-[#a1a1aa]">└</span>
                            <span className="font-medium">{sub.name}</span>
                            <span className="ml-2 text-[11px] text-[#a1a1aa]">({sub.app_id})</span>
                            {subInact && (
                              <span className="ml-2 text-[10px] uppercase" style={{ color: textMuted }}>
                                (inactive)
                              </span>
                            )}
                            <Link
                              href="/admin/cards"
                              className="ml-3 text-[11px] font-medium hover:underline"
                              style={{ color: accent }}
                            >
                              cards
                            </Link>
                          </td>
                          <td className="px-4 py-2 text-xs">—</td>
                          <td className="px-4 py-2 text-xs">{sub.app_id}</td>
                          <td className="px-4 py-2 text-xs">—</td>
                          <td className="px-4 py-2 text-xs">—</td>
                          <td className="px-4 py-2 text-xs">—</td>
                          <td className="px-4 py-2 text-xs" style={{ color: textMuted }}>
                            {chainageLabel(sub)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-xs">
                            <button
                              type="button"
                              className="rounded border px-2 py-1 hover:bg-white"
                              style={{ borderColor: border, color: "#52525b" }}
                              onClick={() => {
                                setFormError(null);
                                setPanel({
                                  mode: "edit-sub",
                                  sub,
                                  sectionName: s.name,
                                });
                              }}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
        {!loading && rows.length === 0 && !loadError && (
          <div className="px-5 py-8 text-center text-sm" style={{ color: textMuted }}>
            No sections yet.
          </div>
        )}
      </div>

      {panel.mode !== "none" && (
        <button
          type="button"
          aria-label="Close panel"
          className="fixed inset-0 z-40 bg-black/20"
          onClick={closePanel}
        />
      )}

      {panel.mode !== "none" && (
        <aside
          className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l shadow-xl"
          style={{ background: "#FCFBFB", borderColor: border }}
        >
          <div
            className="flex items-center justify-between border-b px-4 py-3"
            style={{ borderColor: border }}
          >
            <h3 className="text-sm font-semibold" style={{ color: "#3f3f46" }}>
              {panel.mode === "create-section" && "New section"}
              {panel.mode === "edit-section" && "Edit section"}
              {panel.mode === "create-sub" && `New subsection · ${panel.sectionName}`}
              {panel.mode === "edit-sub" && `Edit subsection · ${panel.sectionName}`}
            </h3>
            <button
              type="button"
              onClick={closePanel}
              className="rounded px-2 py-1 text-lg leading-none text-[#71717a] hover:bg-[#f4f4f5]"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {panel.mode === "create-section" && (
              <SectionForm
                crews={crews}
                submitting={submitting}
                error={formError}
                onCancel={closePanel}
                onSubmit={async (payload) => {
                  setSubmitting(true);
                  setFormError(null);
                  try {
                    const res = await fetch("/api/admin/sections", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    });
                    const data = (await res.json().catch(() => ({}))) as { error?: string };
                    if (!res.ok) throw new Error(data.error ?? "Save failed");
                    await load();
                    closePanel();
                  } catch (e) {
                    setFormError(e instanceof Error ? e.message : "Save failed");
                  } finally {
                    setSubmitting(false);
                  }
                }}
              />
            )}
            {panel.mode === "edit-section" && (
              <SectionForm
                crews={crews}
                initial={panel.section}
                submitting={submitting}
                error={formError}
                onCancel={closePanel}
                onSubmit={async (payload) => {
                  setSubmitting(true);
                  setFormError(null);
                  try {
                    const res = await fetch(`/api/admin/sections/${panel.section.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    });
                    const data = (await res.json().catch(() => ({}))) as { error?: string };
                    if (!res.ok) throw new Error(data.error ?? "Save failed");
                    await load();
                    closePanel();
                  } catch (e) {
                    setFormError(e instanceof Error ? e.message : "Save failed");
                  } finally {
                    setSubmitting(false);
                  }
                }}
              />
            )}
            {panel.mode === "create-sub" && (
              <SubsectionForm
                sectionId={panel.sectionId}
                submitting={submitting}
                error={formError}
                onCancel={closePanel}
                onSubmit={async (payload) => {
                  setSubmitting(true);
                  setFormError(null);
                  try {
                    const res = await fetch("/api/admin/subsections", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    });
                    const data = (await res.json().catch(() => ({}))) as { error?: string };
                    if (!res.ok) throw new Error(data.error ?? "Save failed");
                    await load();
                    closePanel();
                  } catch (e) {
                    setFormError(e instanceof Error ? e.message : "Save failed");
                  } finally {
                    setSubmitting(false);
                  }
                }}
              />
            )}
            {panel.mode === "edit-sub" && (
              <SubsectionForm
                initial={panel.sub}
                submitting={submitting}
                error={formError}
                onCancel={closePanel}
                onDelete={async () => {
                  if (!window.confirm("Delete this subsection? Linked dashboard cards may break.")) return;
                  setSubmitting(true);
                  setFormError(null);
                  try {
                    const res = await fetch(`/api/admin/subsections/${panel.sub.id}`, {
                      method: "DELETE",
                    });
                    const data = (await res.json().catch(() => ({}))) as { error?: string };
                    if (!res.ok) throw new Error(data.error ?? "Delete failed");
                    await load();
                    closePanel();
                  } catch (e) {
                    setFormError(e instanceof Error ? e.message : "Delete failed");
                  } finally {
                    setSubmitting(false);
                  }
                }}
                onSubmit={async (payload) => {
                  setSubmitting(true);
                  setFormError(null);
                  try {
                    const res = await fetch(`/api/admin/subsections/${panel.sub.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    });
                    const data = (await res.json().catch(() => ({}))) as { error?: string };
                    if (!res.ok) throw new Error(data.error ?? "Save failed");
                    await load();
                    closePanel();
                  } catch (e) {
                    setFormError(e instanceof Error ? e.message : "Save failed");
                  } finally {
                    setSubmitting(false);
                  }
                }}
              />
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

type SectionPayload = {
  name: string;
  scope: "shared" | "app";
  app_id: string | null;
  start_ch: number | null;
  end_ch: number | null;
  direction: string | null;
  crew_id: string | null;
  is_active?: boolean;
  show_in_portfolio?: boolean;
};

function parseOptionalNumberField(raw: string): number | null | "invalid" {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : "invalid";
}

function SectionForm({
  crews,
  initial,
  submitting,
  error,
  onCancel,
  onSubmit,
}: {
  crews: CrewOpt[];
  initial?: SectionListRow;
  submitting: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (p: SectionPayload) => void | Promise<void>;
}) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [scope, setScope] = useState<"shared" | "app">(
    initial?.scope === "app" ? "app" : "shared"
  );
  const [appId, setAppId] = useState(initial?.app_id ?? "");
  const [crewId, setCrewId] = useState(initial?.crew_id ?? "");
  const [startCh, setStartCh] = useState(
    initial?.start_ch != null ? String(initial.start_ch) : ""
  );
  const [endCh, setEndCh] = useState(initial?.end_ch != null ? String(initial.end_ch) : "");
  const [direction, setDirection] = useState(initial?.direction ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active !== false);
  const [showInPortfolio, setShowInPortfolio] = useState(initial?.show_in_portfolio !== false);
  const [localError, setLocalError] = useState<string | null>(null);

  const displayError = error ?? localError;

  return (
    <form
      className="space-y-3 text-sm"
      style={{ color: "#3f3f46" }}
      onSubmit={(e) => {
        e.preventDefault();
        setLocalError(null);
        const sc = parseOptionalNumberField(startCh);
        const ec = parseOptionalNumberField(endCh);
        if (sc === "invalid" || ec === "invalid") {
          setLocalError("Chainage values must be valid numbers.");
          return;
        }
        void onSubmit({
          name: name.trim(),
          scope,
          app_id: scope === "app" ? appId.trim() : null,
          start_ch: sc,
          end_ch: ec,
          direction: direction === "" ? null : direction,
          crew_id: crewId === "" ? null : crewId,
          show_in_portfolio: showInPortfolio,
          ...(isEdit ? { is_active: isActive } : {}),
        });
      }}
    >
      <Field label="Name" required>
        <input
          className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
          style={{ borderColor: border }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </Field>
      <Field label="Scope">
        <select
          className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
          style={{ borderColor: border }}
          value={scope}
          onChange={(e) => setScope(e.target.value === "app" ? "app" : "shared")}
        >
          <option value="shared">shared</option>
          <option value="app">app</option>
        </select>
      </Field>
      {scope === "app" && (
        <Field label="App ID" required>
          <input
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
            style={{ borderColor: border }}
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            placeholder="e.g. onsite-d"
            required
          />
        </Field>
      )}
      <Field label="Crew">
        <select
          className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
          style={{ borderColor: border }}
          value={crewId}
          onChange={(e) => setCrewId(e.target.value)}
        >
          <option value="">—</option>
          {crews.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Start CH">
          <input
            type="number"
            step="any"
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
            style={{ borderColor: border }}
            value={startCh}
            onChange={(e) => setStartCh(e.target.value)}
          />
        </Field>
        <Field label="End CH">
          <input
            type="number"
            step="any"
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
            style={{ borderColor: border }}
            value={endCh}
            onChange={(e) => setEndCh(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Direction">
        <select
          className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
          style={{ borderColor: border }}
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
        >
          <option value="">—</option>
          <option value="onwards">onwards</option>
          <option value="backwards">backwards</option>
        </select>
      </Field>
      {isEdit && (
        <label className="flex cursor-pointer items-center gap-2 text-xs" style={{ color: "#52525b" }}>
          <input
            type="checkbox"
            checked={showInPortfolio}
            onChange={(e) => setShowInPortfolio(e.target.checked)}
          />
          Show in portfolio
        </label>
      )}
      {isEdit && (
        <label className="flex cursor-pointer items-center gap-2 text-xs" style={{ color: "#52525b" }}>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
      )}
      {displayError && <p className="text-xs text-red-600">{displayError}</p>}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          style={{ borderColor: border, background: "#fff", color: accent }}
        >
          {submitting ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border px-3 py-1.5 text-xs"
          style={{ borderColor: border, color: "#52525b" }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

type SubPayload = {
  section_id?: string;
  name: string;
  app_id: string;
  start_ch: number | null;
  end_ch: number | null;
  direction: string | null;
  is_active?: boolean;
};

function SubsectionForm({
  sectionId,
  initial,
  submitting,
  error,
  onCancel,
  onSubmit,
  onDelete,
}: {
  sectionId?: string;
  initial?: SubsectionListRow;
  submitting: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (p: SubPayload) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
}) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [appId, setAppId] = useState(initial?.app_id ?? "");
  const [startCh, setStartCh] = useState(
    initial?.start_ch != null ? String(initial.start_ch) : ""
  );
  const [endCh, setEndCh] = useState(initial?.end_ch != null ? String(initial.end_ch) : "");
  const [direction, setDirection] = useState(initial?.direction ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active !== false);
  const [localError, setLocalError] = useState<string | null>(null);
  const displayError = error ?? localError;

  return (
    <form
      className="space-y-3 text-sm"
      style={{ color: "#3f3f46" }}
      onSubmit={(e) => {
        e.preventDefault();
        setLocalError(null);
        if (!isEdit && (!sectionId || !sectionId.trim())) {
          setLocalError("Missing parent section.");
          return;
        }
        const sc = parseOptionalNumberField(startCh);
        const ec = parseOptionalNumberField(endCh);
        if (sc === "invalid" || ec === "invalid") {
          setLocalError("Chainage values must be valid numbers.");
          return;
        }
        const base: SubPayload = {
          name: name.trim(),
          app_id: appId.trim(),
          start_ch: sc,
          end_ch: ec,
          direction: direction === "" ? null : direction,
          ...(isEdit ? { is_active: isActive } : { section_id: sectionId!.trim() }),
        };
        void onSubmit(base);
      }}
    >
      <Field label="Name" required>
        <input
          className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
          style={{ borderColor: border }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </Field>
      <Field label="App ID" required>
        <input
          className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
          style={{ borderColor: border }}
          value={appId}
          onChange={(e) => setAppId(e.target.value)}
          placeholder="e.g. onsite-d"
          required
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Start CH">
          <input
            type="number"
            step="any"
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
            style={{ borderColor: border }}
            value={startCh}
            onChange={(e) => setStartCh(e.target.value)}
          />
        </Field>
        <Field label="End CH">
          <input
            type="number"
            step="any"
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
            style={{ borderColor: border }}
            value={endCh}
            onChange={(e) => setEndCh(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Direction">
        <select
          className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
          style={{ borderColor: border }}
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
        >
          <option value="">—</option>
          <option value="onwards">onwards</option>
          <option value="backwards">backwards</option>
        </select>
      </Field>
      {isEdit && (
        <label className="flex cursor-pointer items-center gap-2 text-xs" style={{ color: "#52525b" }}>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
      )}
      {displayError && <p className="text-xs text-red-600">{displayError}</p>}
      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          style={{ borderColor: border, background: "#fff", color: accent }}
        >
          {submitting ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border px-3 py-1.5 text-xs"
          style={{ borderColor: border, color: "#52525b" }}
        >
          Cancel
        </button>
        {isEdit && onDelete && (
          <button
            type="button"
            disabled={submitting}
            onClick={() => void onDelete()}
            className="ml-auto rounded border px-3 py-1.5 text-xs text-red-700 disabled:opacity-50"
            style={{ borderColor: "#fecaca" }}
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="text-[11px] font-medium uppercase" style={{ color: textMuted }}>
        {label}
        {required && " *"}
      </label>
      {children}
    </div>
  );
}
