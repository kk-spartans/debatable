import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useKeyboard, useRenderer } from "@opentui/react";
import { SyntaxStyle } from "@opentui/core";
import { Effect } from "effect";
import { runDebate } from "./lib/run-debate.ts";
import { writeMarkdown } from "./lib/write-markdown.ts";
import type { DebateResult, AppPhase } from "./lib/debate.ts";
import type { Theme } from "./lib/theme.ts";

const FLUSH_INTERVAL = 30;

interface TextBatch {
  text: string;
  roundIdx: number;
}

interface AppProps {
  initialTopic?: string;
  initialRounds?: number;
  initialMinSearches?: number;
  initialModel?: string;
  theme?: Theme;
}

let _segId = 0;
function nextSegId(): string {
  return `s-${++_segId}`;
}

type Seg = { t: "text"; v: string; _id: string } | { t: "search"; v: string; _id: string };

function appendTextSegment(rounds: Seg[][], idx: number, text: string): Seg[][] {
  const next = rounds.map((r) => [...r]);
  if (!next[idx]) next[idx] = [];
  const last = next[idx].at(-1);
  if (last?.t === "text") {
    next[idx][next[idx].length - 1] = { t: "text", v: last.v + text, _id: last._id };
  } else {
    next[idx].push({ t: "text", v: text, _id: nextSegId() });
  }
  return next;
}

function appendSearchSegment(rounds: Seg[][], idx: number, query: string): Seg[][] {
  const next = rounds.map((r) => [...r]);
  if (!next[idx]) next[idx] = [];
  next[idx].push({ t: "search", v: query, _id: nextSegId() });
  return next;
}

function appendNewlineToLastText(rounds: Seg[][], idx: number): Seg[][] {
  if (idx < 0) return rounds;
  const next = rounds.map((r) => [...r]);
  const segs = next[idx];
  if (!segs || segs.length === 0) return next;
  const last = segs.at(-1);
  if (last?.t !== "text") return next;
  if (last.v.endsWith("\n")) return next;
  segs[segs.length - 1] = { t: "text", v: `${last.v}\n`, _id: last._id };
  return next;
}

interface SetupFormProps {
  topic: string;
  roundsStr: string;
  minSearchesStr: string;
  model: string;
  proModel: string;
  conModel: string;
  judgeModel: string;
  focusIndex: number;
  apiKey: string | undefined;
  theme: Theme;
  onTopicChange: (v: string) => void;
  onRoundsChange: (v: string) => void;
  onMinSearchesChange: (v: string) => void;
  onModelChange: (v: string) => void;
  onProModelChange: (v: string) => void;
  onConModelChange: (v: string) => void;
  onJudgeModelChange: (v: string) => void;
  onEnterField: (index: number) => void;
}

function SetupForm({
  topic,
  roundsStr,
  minSearchesStr,
  model,
  proModel,
  conModel,
  judgeModel,
  focusIndex,
  apiKey,
  theme,
  onTopicChange,
  onRoundsChange,
  onMinSearchesChange,
  onModelChange,
  onProModelChange,
  onConModelChange,
  onJudgeModelChange,
  onEnterField,
}: SetupFormProps) {
  return (
    <box flexGrow={1} alignItems="center" justifyContent="center">
      <box
        borderStyle="rounded"
        borderColor={theme.accent}
        padding={2}
        width={60}
        flexDirection="column"
        title="═══ DEBATE SETUP ═══"
        titleAlignment="center"
      >
        <box marginTop={1} flexDirection="column">
          <text>Debate Topic</text>
          <input
            value={topic}
            placeholder="e.g. Migration increases unemployment"
            focused={focusIndex === 0}
            onSubmit={() => onEnterField(0)}
            onChange={(v) => onTopicChange(v)}
          />
        </box>
        <box marginTop={1} flexDirection="column">
          <text>Number of Rounds</text>
          <input
            value={roundsStr}
            placeholder="3"
            focused={focusIndex === 1}
            onSubmit={() => onEnterField(1)}
            onChange={(v) => onRoundsChange(v)}
          />
        </box>
        <box marginTop={1} flexDirection="column">
          <text>Min Searches Per Turn</text>
          <input
            value={minSearchesStr}
            placeholder="1"
            focused={focusIndex === 2}
            onSubmit={() => onEnterField(2)}
            onChange={(v) => onMinSearchesChange(v)}
          />
        </box>
        <box marginTop={1} flexDirection="column">
          <text>Model</text>
          <input
            value={model}
            placeholder="openrouter/..."
            focused={focusIndex === 3}
            onSubmit={() => onEnterField(3)}
            onChange={(v) => onModelChange(v)}
          />
        </box>
        <box marginTop={1} flexDirection="column">
          <text>PRO Model (override)</text>
          <input
            value={proModel}
            placeholder="Same as Model if empty"
            focused={focusIndex === 4}
            onSubmit={() => onEnterField(4)}
            onChange={(v) => onProModelChange(v)}
          />
        </box>
        <box marginTop={1} flexDirection="column">
          <text>NEG Model (override)</text>
          <input
            value={conModel}
            placeholder="Same as Model if empty"
            focused={focusIndex === 5}
            onSubmit={() => onEnterField(5)}
            onChange={(v) => onConModelChange(v)}
          />
        </box>
        <box marginTop={1} flexDirection="column">
          <text>Judge Model (override)</text>
          <input
            value={judgeModel}
            placeholder="Same as Model if empty"
            focused={focusIndex === 6}
            onSubmit={() => onEnterField(6)}
            onChange={(v) => onJudgeModelChange(v)}
          />
        </box>
        <box marginTop={1}>
          <text fg={theme.subtext}>Tab to navigate · Enter to start · ESC to quit</text>
        </box>
        {!apiKey && (
          <box marginTop={1}>
            <text fg={theme.con}>Error: OPENROUTER_API_KEY not set</text>
          </box>
        )}
      </box>
    </box>
  );
}

interface JudgeResultModalProps {
  judgeResult: { winner: string; reasoning: string };
  syntaxStyle: SyntaxStyle;
  theme: Theme;
}

function JudgeResultModal({ judgeResult, syntaxStyle, theme }: JudgeResultModalProps) {
  return (
    <box
      position="absolute"
      top={2}
      left={4}
      right={4}
      bottom={2}
      alignItems="center"
      justifyContent="center"
    >
      <box
        borderStyle="double"
        borderColor={theme.accent}
        backgroundColor={theme.surface0}
        padding={2}
        width={76}
        maxHeight={18}
        flexDirection="column"
        title="═══ DEBATE RESULT ═══"
        titleAlignment="center"
      >
        <box marginBottom={1}>
          <text>
            Winner:{" "}
            <span fg={judgeResult.winner === "PRO" ? theme.pro : theme.con}>
              {judgeResult.winner}
            </span>
          </text>
        </box>
        <scrollbox
          backgroundColor={theme.surface0}
          scrollY
          stickyScroll
          stickyStart="bottom"
          flexGrow={1}
          paddingX={1}
          paddingTop={1}
        >
          <markdown
            syntaxStyle={syntaxStyle}
            fg={theme.text}
            content={judgeResult.reasoning}
            streaming={false}
          />
        </scrollbox>
        <box marginTop={1}>
          <text fg={theme.subtext}>Press ESC to exit</text>
        </box>
      </box>
    </box>
  );
}

interface DebatePanelsProps {
  topic: string;
  phase: AppPhase;
  proRounds: Seg[][];
  conRounds: Seg[][];
  proFeedback: string;
  conFeedback: string;
  syntaxStyle: SyntaxStyle;
  theme: Theme;
}

function DebatePanels({
  topic,
  phase,
  proRounds,
  conRounds,
  proFeedback,
  conFeedback,
  syntaxStyle,
  theme,
}: DebatePanelsProps) {
  return (
    <box flexDirection="row" flexGrow={1} overflow="hidden">
      <scrollbox
        key="pro"
        borderStyle="rounded"
        borderColor={theme.pro}
        title={`PRO: That ${topic}`}
        flexGrow={1}
        stickyScroll
        stickyStart="bottom"
        scrollY
        paddingX={2}
        paddingTop={1}
      >
        <DebateRounds
          rounds={proRounds}
          side="pro"
          syntaxStyle={syntaxStyle}
          phase={phase}
          theme={theme}
        />
        {proFeedback && (
          <box flexDirection="column" padding={1}>
            <text>{"\n"}</text>
            <markdown
              syntaxStyle={syntaxStyle}
              fg={theme.text}
              content={proFeedback}
              streaming={false}
            />
          </box>
        )}
      </scrollbox>
      <scrollbox
        key="con"
        borderStyle="rounded"
        borderColor={theme.con}
        title={`NEG: Not that ${topic}`}
        flexGrow={1}
        stickyScroll
        stickyStart="bottom"
        scrollY
        paddingX={2}
        paddingTop={1}
      >
        <DebateRounds
          rounds={conRounds}
          side="con"
          syntaxStyle={syntaxStyle}
          phase={phase}
          theme={theme}
        />
        {conFeedback && (
          <box flexDirection="column" padding={1}>
            <text>{"\n"}</text>
            <markdown
              syntaxStyle={syntaxStyle}
              fg={theme.text}
              content={conFeedback}
              streaming={false}
            />
          </box>
        )}
      </scrollbox>
    </box>
  );
}

interface DebateRoundsProps {
  rounds: Seg[][];
  side: "pro" | "con";
  syntaxStyle: SyntaxStyle;
  phase: AppPhase;
  theme: Theme;
}

let _roundId = 0;
function nextRoundId(): string {
  return `r-${++_roundId}`;
}

function DebateRounds({ rounds, side, syntaxStyle, phase, theme }: DebateRoundsProps) {
  const accent = side === "pro" ? theme.pro : theme.con;
  const name = side === "pro" ? "PRO" : "NEG";

  if (rounds.length === 0) return <text fg={theme.muted}>Waiting&hellip;</text>;

  const roundElements: React.ReactNode[] = [];
  for (let ri = 0; ri < rounds.length; ri++) {
    const segs = rounds[ri]!;
    const roundId = segs.length > 0 ? segs[0]!._id : nextRoundId();

    roundElements.push(
      <box key={roundId} flexDirection="column">
        <text fg={accent}>
          ─── {name} : Round {ri + 1} ─── <br />
        </text>
        {segs.length > 0 ? (
          segs.map((seg) =>
            seg.t === "search" ? (
              <text key={seg._id} fg={theme.muted}>
                Search: {seg.v}
                <br />
              </text>
            ) : (
              <>
                <markdown
                  key={seg._id}
                  syntaxStyle={syntaxStyle}
                  content={seg.v}
                  streaming={phase === "debating"}
                />
                <text>{"\n"}</text>
              </>
            ),
          )
        ) : (
          <text fg={theme.muted}>Waiting&hellip;</text>
        )}
      </box>,
    );
  }
  return roundElements;
}

export function App({ initialTopic, initialModel, theme: _theme }: AppProps) {
  const theme = _theme ?? {
    accent: "#f5c2e7",
    pro: "#89b4fa",
    con: "#f38ba8",
    text: "#cdd6f4",
    subtext: "#a6adc8",
    surface0: "#313244",
    muted: "#6c7086",
  };
  const renderer = useRenderer();

  const [phase, setPhase] = useState<AppPhase>(initialTopic ? "debating" : "setup");
  const phaseRef = useRef<AppPhase>(phase);
  phaseRef.current = phase;

  const [topic, setTopic] = useState(initialTopic ?? "");
  const [roundsStr, setRoundsStr] = useState("");
  const [minSearchesStr, setMinSearchesStr] = useState("");
  const [model, setModel] = useState(initialModel ?? "");
  const [proModel, setProModel] = useState("");
  const [conModel, setConModel] = useState("");
  const [judgeModel, setJudgeModel] = useState("");
  const [focusIndex, setFocusIndex] = useState(0);

  const [_currentRound, setCurrentRound] = useState(0);
  const [proRounds, setProRounds] = useState<Seg[][]>([]);
  const [conRounds, setConRounds] = useState<Seg[][]>([]);
  const [proFeedback, setProFeedback] = useState("");
  const [conFeedback, setConFeedback] = useState("");
  const [judgeResult, setJudgeResult] = useState<{ winner: string; reasoning: string } | null>(
    null,
  );

  const proTextBuffer = useRef<TextBatch[]>([]);
  const conTextBuffer = useRef<TextBatch[]>([]);
  const flushScheduled = useRef(false);
  const lastFlushTime = useRef(0);

  const flushTextBuffers = useCallback(() => {
    flushScheduled.current = false;
    lastFlushTime.current = Date.now();

    const proBatch = proTextBuffer.current;
    proTextBuffer.current = [];
    if (proBatch.length > 0) {
      setProRounds((prev) => {
        let c = prev;
        for (const { text, roundIdx } of proBatch) {
          c = appendTextSegment(c, roundIdx, text);
        }
        return c;
      });
    }

    const conBatch = conTextBuffer.current;
    conTextBuffer.current = [];
    if (conBatch.length > 0) {
      setConRounds((prev) => {
        let c = prev;
        for (const { text, roundIdx } of conBatch) {
          c = appendTextSegment(c, roundIdx, text);
        }
        return c;
      });
    }
  }, []);

  const scheduleFlush = useCallback(() => {
    const now = Date.now();
    const elapsed = now - lastFlushTime.current;
    if (elapsed >= FLUSH_INTERVAL) {
      flushTextBuffers();
    } else if (!flushScheduled.current) {
      flushScheduled.current = true;
      setTimeout(() => {
        flushScheduled.current = false;
        flushTextBuffers();
      }, FLUSH_INTERVAL - elapsed);
    }
  }, [flushTextBuffers]);

  const syntaxStyle = useMemo(() => SyntaxStyle.create(), []);

  const exitGuard = useRef(false);
  const debateRef = useRef<DebateResult | null>(null);
  const startDebateRef = useRef<() => void>(() => {});
  const currentRoundIdx = useRef(-1);
  const shownSearchesPro = useRef<Set<string> | null>(null);
  if (shownSearchesPro.current === null) shownSearchesPro.current = new Set();
  const shownSearchesCon = useRef<Set<string> | null>(null);
  if (shownSearchesCon.current === null) shownSearchesCon.current = new Set();

  const apiKey = process.env.OPENROUTER_API_KEY;

  useEffect(() => {
    function cleanup() {
      if (!exitGuard.current) {
        exitGuard.current = true;
        try {
          renderer.destroy();
        } catch {}
        process.exit(0);
      }
    }
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
    return () => {
      process.off("SIGINT", cleanup);
      process.off("SIGTERM", cleanup);
    };
  }, [renderer]);

  const autoStarted = useRef(false);
  useEffect(() => {
    if (initialTopic && phase === "debating" && !autoStarted.current) {
      autoStarted.current = true;
      startDebateRef.current();
    }
  }, [initialTopic, phase]);

  useEffect(() => {
    if (phase !== "debating") {
      flushTextBuffers();
    }
    return () => {
      flushTextBuffers();
    };
  }, [phase, flushTextBuffers]);

  useKeyboard(
    useCallback(
      (key) => {
        if (key.name === "escape") {
          if (!exitGuard.current) {
            exitGuard.current = true;
            try {
              renderer.destroy();
            } catch {}
            process.exit(0);
          }
          return;
        }

        if (phaseRef.current === "setup") {
          if (key.name === "tab" && !key.shift) {
            setFocusIndex((i) => (i + 1) % 7);
          }
          if (key.name === "tab" && key.shift) {
            setFocusIndex((i) => (i - 1 + 7) % 7);
          }
          return;
        }
      },
      [renderer],
    ),
  );

  const startDebate = useCallback(async () => {
    if (!topic || !apiKey || !model) return;

    const r = Math.max(1, parseInt(roundsStr, 10) || 3);
    const ms = Math.max(1, parseInt(minSearchesStr, 10) || 1);
    setCurrentRound(0);
    setProRounds([]);
    setConRounds([]);
    setProFeedback("");
    setConFeedback("");
    setJudgeResult(null);
    currentRoundIdx.current = -1;
    shownSearchesPro.current = new Set();
    shownSearchesCon.current = new Set();
    setPhase("debating");

    try {
      const effect = runDebate(
        {
          topic,
          rounds: r,
          minSearches: ms,
          apiKey,
          model,
          proModel: proModel || undefined,
          conModel: conModel || undefined,
          judgeModel: judgeModel || undefined,
        },
        {
          onStatus: () => {},
          onRound: (round) => {
            const prevRoundIdx = currentRoundIdx.current;
            setProRounds((prev) => appendNewlineToLastText(prev, prevRoundIdx));
            setConRounds((prev) => appendNewlineToLastText(prev, prevRoundIdx));
            setCurrentRound(round);
            if (currentRoundIdx.current < round - 1) {
              currentRoundIdx.current = round - 1;
              setProRounds((prev) => {
                const next = [...prev];
                if (!next[round - 1]) next[round - 1] = [];
                return next;
              });
              setConRounds((prev) => {
                const next = [...prev];
                if (!next[round - 1]) next[round - 1] = [];
                return next;
              });
            }
          },
          onProText: (t) => {
            proTextBuffer.current.push({ text: t, roundIdx: Math.max(0, currentRoundIdx.current) });
            scheduleFlush();
          },
          onConText: (t) => {
            conTextBuffer.current.push({ text: t, roundIdx: Math.max(0, currentRoundIdx.current) });
            scheduleFlush();
          },
          onProSearch: (query) => {
            if (shownSearchesPro.current!.has(query)) return;
            shownSearchesPro.current!.add(query);
            setProRounds((prev) =>
              appendSearchSegment(prev, Math.max(0, currentRoundIdx.current), query),
            );
          },
          onConSearch: (query) => {
            if (shownSearchesCon.current!.has(query)) return;
            shownSearchesCon.current!.add(query);
            setConRounds((prev) =>
              appendSearchSegment(prev, Math.max(0, currentRoundIdx.current), query),
            );
          },
          onProFeedback: (t) => setProFeedback((prev) => prev + t),
          onConFeedback: (t) => setConFeedback((prev) => prev + t),
          onJudgeResult: (_winner, reasoning) => {
            setJudgeResult((prev) => {
              if (prev && prev.winner) return prev;
              const firstLine = reasoning.split("\n")[0] ?? "";
              const w = firstLine.includes("PRO") && !firstLine.includes("NEG") ? "PRO" : "NEG";
              return { winner: w, reasoning };
            });
          },
        },
      );
      const result = await Effect.runPromise(effect);
      debateRef.current = result;

      writeMarkdown(result);

      setJudgeResult(result.judgeResult);
      setPhase("done");
    } catch (e: unknown) {
      console.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [
    topic,
    roundsStr,
    minSearchesStr,
    apiKey,
    model,
    proModel,
    conModel,
    judgeModel,
    scheduleFlush,
  ]);

  startDebateRef.current = startDebate;

  const handleEnterOnField = useCallback(
    (index: number) => {
      if (index < 6) {
        setFocusIndex(index + 1);
      } else {
        void startDebate();
      }
    },
    [startDebate],
  );

  return (
    <box flexDirection="column" flexGrow={1}>
      {phase === "setup" && (
        <SetupForm
          topic={topic}
          roundsStr={roundsStr}
          minSearchesStr={minSearchesStr}
          model={model}
          proModel={proModel}
          conModel={conModel}
          judgeModel={judgeModel}
          focusIndex={focusIndex}
          apiKey={apiKey}
          theme={theme}
          onTopicChange={setTopic}
          onRoundsChange={setRoundsStr}
          onMinSearchesChange={setMinSearchesStr}
          onModelChange={setModel}
          onProModelChange={setProModel}
          onConModelChange={setConModel}
          onJudgeModelChange={setJudgeModel}
          onEnterField={handleEnterOnField}
        />
      )}

      {phase !== "setup" && (
        <DebatePanels
          topic={topic}
          phase={phase}
          proRounds={proRounds}
          conRounds={conRounds}
          proFeedback={proFeedback}
          conFeedback={conFeedback}
          syntaxStyle={syntaxStyle}
          theme={theme}
        />
      )}

      {phase === "done" && judgeResult && (
        <JudgeResultModal judgeResult={judgeResult} syntaxStyle={syntaxStyle} theme={theme} />
      )}
    </box>
  );
}
