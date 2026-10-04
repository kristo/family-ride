"use client";

import { useEffect, useState } from "react";
import { PitchesPanel } from "@/components/admin/PitchesPanel";
import type { RouteSubmission } from "@/lib/types";

type ModerationTabProps = {
  hidden: boolean;
  /** Wywoływane po zatwierdzeniu zgłoszenia, żeby zakładka Trasy odświeżyła swoją listę. */
  onRoutesChanged: () => void;
};

export function ModerationTab({ hidden, onRoutesChanged }: ModerationTabProps) {
  const [pendingSubmissions, setPendingSubmissions] = useState<RouteSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState<boolean>(false);
  const [moderationMessage, setModerationMessage] = useState<string>("");

  const loadPendingSubmissions = async () => {
    setSubmissionsLoading(true);
    try {
      const response = await fetch("/api/admin/submissions?status=pending", { method: "GET" });
      const payload = (await response.json()) as { submissions?: RouteSubmission[] };
      setPendingSubmissions(Array.isArray(payload.submissions) ? payload.submissions : []);
    } catch {
      setPendingSubmissions([]);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadPendingSubmissions();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, []);

  const moderateSubmission = async (id: string, action: "approve" | "reject") => {
    setModerationMessage(action === "approve" ? "Zatwierdzam zgłoszenie..." : "Odrzucam zgłoszenie...");

    try {
      const response = await fetch(`/api/admin/submissions/${id}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reviewedBy: "admin" }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setModerationMessage(payload.error ?? "Operacja moderacji nie powiodła się.");
        return;
      }

      setModerationMessage(action === "approve" ? "Zgłoszenie zatwierdzone i opublikowane." : "Zgłoszenie odrzucone.");
      await loadPendingSubmissions();
      onRoutesChanged();
    } catch {
      setModerationMessage("Operacja moderacji nie powiodła się.");
    }
  };

  return (
    <section
      id="moderation-queue"
      className={`rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[0_10px_34px_rgba(16,32,22,.1)] md:p-8 ${hidden ? "hidden" : ""}`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold">Kolejka moderacji</h2>
        <button
          type="button"
          onClick={() => void loadPendingSubmissions()}
          className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold hover:bg-black/5"
        >
          Odśwież
        </button>
      </div>

      {moderationMessage.length > 0 && (
        <p className="mb-3 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--muted)]">{moderationMessage}</p>
      )}

      {submissionsLoading ? (
        <p className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--muted)]">Ładowanie zgłoszeń...</p>
      ) : pendingSubmissions.length === 0 ? (
        <p className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--muted)]">Brak zgłoszeń oczekujacych na moderacje.</p>
      ) : (
        <ul className="grid gap-3">
          {pendingSubmissions.map((submission) => (
            <li key={submission.id} className="rounded-xl border border-[var(--line)] bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{submission.draft.name}</p>
                  <p className="text-sm text-[var(--muted)]">
                    Autor: {submission.submitterName}
                    {submission.submitterEmail ? ` (${submission.submitterEmail})` : ""}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {submission.draft.region} | {submission.draft.distanceKm} km | status: {submission.status}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void moderateSubmission(submission.id, "approve")}
                    className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900"
                  >
                    Zatwierdz
                  </button>
                  <button
                    type="button"
                    onClick={() => void moderateSubmission(submission.id, "reject")}
                    className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-900"
                  >
                    Odrzuc
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <PitchesPanel />
    </section>
  );
}
