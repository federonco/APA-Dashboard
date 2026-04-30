"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  METRICS_IN_ADMIN_WIZARD,
  catalogueEntry,
  categoryLabel,
  type MetricCategory,
} from "@/lib/metric-catalogue";
import { CardPreview } from "@/components/admin/CardPreview";
import { tokens } from "@/lib/designTokens";

export type DashboardCardRow = {
  id: string;
  metric_key: string;
  section_id: string | null;
  subsection_id: string | null;
  crew_id: string | null;
  label: string;
  sort_order: number;
  is_visible: boolean;
  section_name?: string | null;
  subsection_name?: string | null;
  crew_name?: string | null;
};

type SectionOpt = { id: string; name: string; is_active?: boolean | null };
type CrewOpt = { id: string; name: string };
type SubOpt = { id: string; name: string; section_id: string };

const GROUP_ORDER: MetricCategory[] = ["pipe_laying", "psp", "welding", "water"];

export function AddCardWizard({
  open,
  onClose,
  onSaved,
  editCard,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editCard: DashboardCardRow | null;
}) {
  const [step, setStep] = useState(1);
  const [metricKey, setMetricKey] = useState<string>(METRICS_IN_ADMIN_WIZARD[0]?.key ?? "pipes_today");
  const [sectionId, setSectionId] = useState("");
  const [subsectionId, setSubsectionId] = useState<string | null>(null);
  const [crewId, setCrewId] = useState("");
  const [label, setLabel] = useState("");
  const [sections, setSections] = useState<SectionOpt[]>([]);
  const [crews, setCrews] = useState<CrewOpt[]>([]);
  const [subsections, setSubsections] = useState<SubOpt[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cat = catalogueEntry(metricKey);

  const groupedMetrics = useMemo(() => {
    const m = new Map<MetricCategory, typeof METRICS_IN_ADMIN_WIZARD>();
    for (const g of GROUP_ORDER) m.set(g, []);
    for (const entry of METRICS_IN_ADMIN_WIZARD) {
      const list = m.get(entry.category) ?? [];
      list.push(entry);
      m.set(entry.category, list);
    }
    return m;
  }, []);

  const reset = useCallback(() => {
    setStep(1);
    setMetricKey(METRICS_IN_ADMIN_WIZARD[0]?.key ?? "pipes_today");
    setSectionId("");
    setSubsectionId(null);
    setCrewId("");
    setLabel("");
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (editCard) {
      setMetricKey(editCard.metric_key);
      setSectionId(editCard.section_id ?? "");
      setSubsectionId(editCard.subsection_id);
      setCrewId(editCard.crew_id ?? "");
      setLabel(editCard.label);
      setStep(5);
    } else {
      reset();
    }
  }, [open, editCard?.id, reset, editCard]);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const [secRes, crewRes] = await Promise.all([
        fetch("/api/admin/sections"),
        fetch("/api/admin/crews"),
      ]);
      if (secRes.ok) {
        const data = (await secRes.json()) as SectionOpt[];
        setSections(data.filter((s) => s.is_active !== false));
      }
      if (crewRes.ok) setCrews(await crewRes.json());
    })();
  }, [open]);

  useEffect(() => {
    if (!open || !sectionId || !cat?.allowsSubsection) {
      setSubsections([]);
      return;
    }
    void (async () => {
      const res = await fetch(`/api/admin/subsections?section_id=${encodeURIComponent(sectionId)}`);
      if (res.ok) {
        const rows = (await res.json()) as SubOpt[];
        setSubsections(rows);
      } else {
        setSubsections([]);
      }
    })();
  }, [open, sectionId, cat?.allowsSubsection]);

  const sectionName = sections.find((s) => s.id === sectionId)?.name ?? null;
  const subsectionName = subsectionId
    ? subsections.find((s) => s.id === subsectionId)?.name ?? editCard?.subsection_name ?? null
    : null;
  const crewName = crews.find((c) => c.id === crewId)?.name
    ? `Crew ${crews.find((c) => c.id === crewId)?.name}`
    : null;

  function nextFromMetric() {
    if (!cat) return;
    if (cat.requiresSection) setStep(2);
    else if (cat.requiresCrew) setStep(4);
    else setStep(5);
  }

  function nextFromSection() {
    if (!cat) return;
    if (cat.allowsSubsection) setStep(3);
    else if (cat.requiresCrew) setStep(4);
    else setStep(5);
  }

  function nextFromSubsection() {
    if (!cat) return;
    if (cat.requiresCrew) setStep(4);
    else setStep(5);
  }

  function nextFromCrew() {
    setStep(5);
  }

  function buildDefaultLabel(): string {
    const c = catalogueEntry(metricKey);
    if (!c) return label;
    if (metricKey === "weld_done") return "Joints Welded";
    if (metricKey === "wrap_done") return "Joints Wrapped";
    const parts: string[] = [c.label];
    if (sectionName) parts.push(`— ${sectionName}`);
    if (subsectionName) parts.push(`(${subsectionName})`);
    if (crewName) parts.push(crewName);
    return parts.join(" ");
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        metric_key: metricKey,
        label: label.trim() || buildDefaultLabel(),
        section_id: cat?.requiresSection ? sectionId || null : null,
        subsection_id: cat?.allowsSubsection && subsectionId ? subsectionId : null,
        crew_id: cat?.requiresCrew ? crewId || null : null,
      };
      if (cat?.requiresSection && !body.section_id) {
        setError("Select a section");
        setSaving(false);
        return;
      }
      if (cat?.requiresCrew && !body.crew_id) {
        setError("Select a crew");
        setSaving(false);
        return;
      }
      const url = editCard ? `/api/admin/dashboard-cards/${editCard.id}` : "/api/admin/dashboard-cards";
      const method = editCard ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Save failed");
      onSaved();
      onClose();
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border bg-white p-6 shadow-xl"
        style={{ borderColor: tokens.theme.border }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-800">{editCard ? "Edit card" : "Add dashboard card"}</h2>
          <button type="button" className="text-zinc-500 hover:text-zinc-800" onClick={onClose}>
            ✕
          </button>
        </div>
        <p className="mb-4 text-xs text-zinc-500">Step {step} of 5</p>
        {error && (
          <p className="mb-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {step === 1 && (
          <div className="space-y-6">
            {GROUP_ORDER.map((g) => {
              const items = groupedMetrics.get(g) ?? [];
              if (items.length === 0) return null;
              return (
                <div key={g}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {categoryLabel(g)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {items.map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setMetricKey(m.key)}
                        className="rounded-lg border px-3 py-2 text-left text-sm transition-colors"
                        style={{
                          borderColor: metricKey === m.key ? "#B96A2D" : tokens.theme.border,
                          background: metricKey === m.key ? "#FFF7ED" : "#fff",
                        }}
                      >
                        {m.icon ? <span className="mr-1">{m.icon}</span> : null}
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="rounded-md border border-zinc-200 px-4 py-2 text-sm" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-[#B96A2D] px-4 py-2 text-sm font-medium text-white"
                onClick={() => nextFromMetric()}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 2 && cat?.requiresSection && (
          <div>
            <p className="mb-2 text-sm text-zinc-600">Choose section</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {sections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSectionId(s.id)}
                  className="rounded-full border px-3 py-1.5 text-sm"
                  style={{
                    borderColor: sectionId === s.id ? "#B96A2D" : tokens.theme.border,
                    background: sectionId === s.id ? "#FFF7ED" : "#fff",
                  }}
                >
                  {s.name}
                </button>
              ))}
            </div>
            <div className="flex justify-between gap-2">
              <button type="button" className="text-sm text-zinc-600" onClick={() => setStep(1)}>
                ← Back
              </button>
              <button
                type="button"
                className="rounded-md bg-[#B96A2D] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                disabled={!sectionId}
                onClick={() => nextFromSection()}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && cat?.allowsSubsection && (
          <div>
            <p className="mb-2 text-sm text-zinc-600">Scope (optional subsection)</p>
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSubsectionId(null)}
                className="rounded-full border px-3 py-1.5 text-sm"
                style={{
                  borderColor: subsectionId === null ? "#B96A2D" : tokens.theme.border,
                  background: subsectionId === null ? "#FFF7ED" : "#fff",
                }}
              >
                Full section
              </button>
              {subsections.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSubsectionId(sub.id)}
                  className="rounded-full border px-3 py-1.5 text-sm"
                  style={{
                    borderColor: subsectionId === sub.id ? "#B96A2D" : tokens.theme.border,
                    background: subsectionId === sub.id ? "#FFF7ED" : "#fff",
                  }}
                >
                  {sub.name}
                </button>
              ))}
            </div>
            <div className="flex justify-between gap-2">
              <button type="button" className="text-sm text-zinc-600" onClick={() => setStep(2)}>
                ← Back
              </button>
              <button
                type="button"
                className="rounded-md bg-[#B96A2D] px-4 py-2 text-sm font-medium text-white"
                onClick={() => nextFromSubsection()}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 4 && cat?.requiresCrew && (
          <div>
            <p className="mb-2 text-sm text-zinc-600">Choose crew</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {crews.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCrewId(c.id)}
                  className="rounded-full border px-3 py-1.5 text-sm"
                  style={{
                    borderColor: crewId === c.id ? "#B96A2D" : tokens.theme.border,
                    background: crewId === c.id ? "#FFF7ED" : "#fff",
                  }}
                >
                  Crew {c.name}
                </button>
              ))}
            </div>
            <div className="flex justify-between gap-2">
              <button
                type="button"
                className="text-sm text-zinc-600"
                onClick={() => {
                  if (cat?.allowsSubsection) setStep(3);
                  else if (cat?.requiresSection) setStep(2);
                  else setStep(1);
                }}
              >
                ← Back
              </button>
              <button
                type="button"
                className="rounded-md bg-[#B96A2D] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                disabled={!crewId}
                onClick={() => nextFromCrew()}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Label</label>
              <input
                className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={buildDefaultLabel()}
              />
            </div>
            <CardPreview
              label={label.trim() || buildDefaultLabel()}
              metricKey={metricKey}
              sectionName={sectionName}
              subsectionName={subsectionName}
              crewName={crewName}
              value={null}
            />
            <div className="flex flex-wrap justify-between gap-2 pt-2">
              <button
                type="button"
                className="text-sm text-zinc-600"
                onClick={() => {
                  if (!cat) return;
                  if (cat.requiresCrew) setStep(4);
                  else if (cat.allowsSubsection) setStep(3);
                  else if (cat.requiresSection) setStep(2);
                  else setStep(1);
                }}
              >
                ← Back
              </button>
              <div className="flex gap-2">
                <button type="button" className="rounded-md border border-zinc-200 px-4 py-2 text-sm" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-md bg-[#B96A2D] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                  disabled={saving}
                  onClick={() => void handleSave()}
                >
                  {saving ? "Saving…" : editCard ? "Save changes" : "Create card"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
