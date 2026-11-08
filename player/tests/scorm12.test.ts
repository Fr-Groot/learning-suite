import { describe, expect, it } from "vitest";
import { scormTime, Scorm12Tracker, serializeState, SUSPEND_MAX, type Scorm12API } from "../src/tracker/scorm12.ts";
import type { Report, SavedState } from "../src/tracker/tracker.ts";
import { miniProject } from "./fixture.ts";

/** Faux LMS : garde les valeurs en mémoire et note les appels. */
function fakeLms(initial: Record<string, string> = {}) {
  const data: Record<string, string> = { "cmi.core.lesson_status": "not attempted", "cmi.core.entry": "ab-initio", ...initial };
  const calls: string[] = [];
  const api: Scorm12API = {
    LMSInitialize: () => (calls.push("init"), "true"),
    LMSFinish: () => (calls.push("finish"), "true"),
    LMSGetValue: (k) => data[k] ?? "",
    LMSSetValue: (k, v) => ((data[k] = v), "true"),
    LMSCommit: () => (calls.push("commit"), "true"),
    LMSGetLastError: () => "0",
  };
  return { api, data, calls };
}

const state = (over: Partial<SavedState> = {}): SavedState => ({ v: 1, page: 2, visited: [0, 1, 2], unlocked: [0, 1], activities: {}, ...over });
const report = (over: Partial<Report> = {}): Report => ({
  pageId: "p3", progress: 0.5, status: "incomplete", score: null, state: state(), ...over,
});

describe("SCORM 1.2", () => {
  it("démarre : statut incomplete, pas de reprise au premier lancement", () => {
    const lms = fakeLms();
    const t = new Scorm12Tracker(lms.api);
    expect(t.start(miniProject().meta)).toBeNull();
    expect(lms.data["cmi.core.lesson_status"]).toBe("incomplete");
  });

  it("envoie position, état, score et statut, puis enregistre", () => {
    const lms = fakeLms();
    const t = new Scorm12Tracker(lms.api);
    t.start(miniProject().meta);
    t.update(report({ status: "passed", score: { raw: 2, max: 2, percent: 100, passed: true, complete: true } }));
    expect(lms.data).toMatchObject({
      "cmi.core.lesson_location": "p3",
      "cmi.core.lesson_status": "passed",
      "cmi.core.score.raw": "100",
      "cmi.core.score.min": "0",
      "cmi.core.score.max": "100",
    });
    expect(JSON.parse(lms.data["cmi.suspend_data"])).toEqual(state());
    expect(lms.calls).toContain("commit");
  });

  it("reprend l'état quand le LMS indique un retour (entry = resume)", () => {
    const lms = fakeLms({ "cmi.core.entry": "resume", "cmi.core.lesson_status": "incomplete", "cmi.suspend_data": JSON.stringify(state()) });
    expect(new Scorm12Tracker(lms.api).start(miniProject().meta)).toEqual(state());
  });

  it("ignore un état sauvegardé abîmé", () => {
    const lms = fakeLms({ "cmi.core.entry": "resume", "cmi.suspend_data": "{pas du json" });
    expect(new Scorm12Tracker(lms.api).start(miniProject().meta)).toBeNull();
  });

  it("fin de session : durée, sortie « suspend » si pas terminé, puis LMSFinish une seule fois", () => {
    let now = 0;
    const lms = fakeLms();
    const t = new Scorm12Tracker(lms.api, { now: () => now });
    t.start(miniProject().meta);
    now = 65_500;
    t.finish();
    t.finish();
    expect(lms.data["cmi.core.session_time"]).toBe("0000:01:05.50");
    expect(lms.data["cmi.core.exit"]).toBe("suspend");
    expect(lms.calls.filter((c) => c === "finish")).toHaveLength(1);
  });

  it("sortie normale quand le module est réussi", () => {
    const lms = fakeLms();
    const t = new Scorm12Tracker(lms.api);
    t.start(miniProject().meta);
    t.update(report({ status: "passed" }));
    t.finish();
    expect(lms.data["cmi.core.exit"]).toBe("");
  });

  it("allège l'état s'il dépasse 4096 caractères", () => {
    const activities: SavedState["activities"] = {};
    for (let i = 0; i < 80; i++) {
      activities[`question-${i}`] = { attemptsUsed: 1, done: true, correct: false, lastResponse: ["choix-a", "choix-b", "choix-c", "choix-d"] };
    }
    const text = serializeState(state({ activities }));
    expect(text.length).toBeLessThanOrEqual(SUSPEND_MAX);
    expect(JSON.parse(text).page).toBe(2);
  });

  it("format de durée SCORM 1.2", () => {
    expect(scormTime(0)).toBe("0000:00:00.00");
    expect(scormTime(3_725_250)).toBe("0001:02:05.25");
  });
});
