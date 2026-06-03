import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useKeyboard, useRenderer } from "@opentui/react";
import { SyntaxStyle } from "@opentui/core";
import OpenAI from "openai";
import { runDebate } from "./lib/run-debate.ts";
import { writeMarkdown } from "./lib/write-markdown.ts";
import type { DebateResult, AppPhase } from "./lib/debate.ts";

const ROSEWATER = "#f5e0dc";
const TEXT = "#cdd6f4";
const SUBTEXT = "#a6adc8";
const SURFACE0 = "#313244";
const SURFACE1 = "#45475a";
const PINK = "#f5c2e7";
const PRO_BLUE = "#89b4fa";
const CON_RED = "#f38ba8";
const MUTED = "#6c7086";

interface AppProps {
  initialTopic?: string;
  initialRounds?: number;
  initialMinSearches?: number;
}

type Seg = { t: "text"; v: string } | { t: "search"; v: string };

function appendTextSegment(rounds: Seg[][], idx: number, text: string): Seg[][] {
  const next = rounds.map((r) => [...r]);
  if (!next[idx]) next[idx] = [];
  const last = next[idx][next[idx].length - 1];
  if (next[idx].length > 0 && last?.t === "text") {
    next[idx][next[idx].length - 1] = { t: "text", v: last.v + text };
  } else {
    next[idx].push({ t: "text", v: text });
  }
  return next;
}

function appendSearchSegment(rounds: Seg[][], idx: number, query: string): Seg[][] {
  const next = rounds.map((r) => [...r]);
  if (!next[idx]) next[idx] = [];
  next[idx].push({ t: "search", v: query });
  return next;
}

function appendNewlineToLastText(rounds: Seg[][], idx: number): Seg[][] {
  if (idx < 0) return rounds;
  const next = rounds.map((r) => [...r]);
  const segs = next[idx];
  if (!segs || segs.length === 0) return next;
  const last = segs[segs.length - 1];
  if (last?.t !== "text") return next;
  if (last.v.endsWith("\n")) return next;
  segs[segs.length - 1] = { t: "text", v: `${last.v}\n` };
  return next;
}

export function App({ initialTopic, initialRounds, initialMinSearches }: AppProps) {
  const renderer = useRenderer();

  const [phase, setPhase] = useState<AppPhase>(initialTopic ? "debating" : "setup");
  const phaseRef = useRef<AppPhase>(phase);
  phaseRef.current = phase;

  const [topic, setTopic] = useState(initialTopic ?? "");
  const [roundsStr, setRoundsStr] = useState("");
  const [minSearchesStr, setMinSearchesStr] = useState("");
  const [focusIndex, setFocusIndex] = useState(0);

  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(3);
  const [status, setStatus] = useState("");
  const [proRounds, setProRounds] = useState<Seg[][]>([]);
  const [conRounds, setConRounds] = useState<Seg[][]>([]);
  const [proFeedback, setProFeedback] = useState("");
  const [conFeedback, setConFeedback] = useState("");
  const [judgeResult, setJudgeResult] = useState<{ winner: string; reasoning: string } | null>(null);


  const syntaxStyle = useMemo(() => SyntaxStyle.create(), []);

  const exitGuard = useRef(false);
  const debateRef = useRef<DebateResult | null>(null);
  const startDebateRef = useRef<() => void>(() => {});
  const currentRoundIdx = useRef(-1);
  const shownSearchesPro = useRef(new Set<string>());
  const shownSearchesCon = useRef(new Set<string>());

  const apiKey = process.env.OPENROUTER_API_KEY;

  useEffect(() => {
    function cleanup() {
      if (!exitGuard.current) {
        exitGuard.current = true;
        try { renderer.destroy(); } catch {}
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

  useEffect(() => {
    if (initialTopic && phase === "debating") {
      startDebateRef.current();
    }
  }, []);

  useKeyboard(
    useCallback(
      (key) => {
        if (key.name === "escape") {
          if (!exitGuard.current) {
            exitGuard.current = true;
            try { renderer.destroy(); } catch {}
            process.exit(0);
          }
          return;
        }

        if (phaseRef.current === "setup") {
          if (key.name === "tab" && !key.shift) {
            setFocusIndex((i) => (i + 1) % 3);
          }
          if (key.name === "tab" && key.shift) {
            setFocusIndex((i) => (i - 1 + 3) % 3);
          }
          return;
        }
      },
      [renderer],
    ),
  );

  const startDebate = useCallback(async () => {
    if (!topic || !apiKey) return;

    const r = Math.max(1, parseInt(roundsStr, 10) || 3);
    const ms = Math.max(1, parseInt(minSearchesStr, 10) || 1);
    setTotalRounds(r);
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

    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
    });

    try {
      const result = await runDebate(topic, r, ms, openai, {
        onStatus: (s) => setStatus(s),
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
          setProRounds((prev) => appendTextSegment(prev, Math.max(0, currentRoundIdx.current), t));
        },
        onConText: (t) => {
          setConRounds((prev) => appendTextSegment(prev, Math.max(0, currentRoundIdx.current), t));
        },
        onProSearch: (query) => {
          if (shownSearchesPro.current.has(query)) return;
          shownSearchesPro.current.add(query);
          setProRounds((prev) => appendSearchSegment(prev, Math.max(0, currentRoundIdx.current), query));
        },
        onConSearch: (query) => {
          if (shownSearchesCon.current.has(query)) return;
          shownSearchesCon.current.add(query);
          setConRounds((prev) => appendSearchSegment(prev, Math.max(0, currentRoundIdx.current), query));
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
      });
      debateRef.current = result;

      writeMarkdown(result);
      setStatus("Debate concluded");

      setJudgeResult(result.judgeResult);
      setPhase("done");
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [topic, roundsStr, minSearchesStr, apiKey]);

  startDebateRef.current = startDebate;

  const handleEnterOnField = useCallback(
    (index: number) => {
      if (index < 2) {
        setFocusIndex(index + 1);
      } else {
        startDebate();
      }
    },
    [startDebate],
  );

  function renderSegments(rounds: Seg[][], side: "pro" | "con") {
    const accent = side === "pro" ? PRO_BLUE : CON_RED;
    const name = side === "pro" ? "PRO" : "NEG";

    if (rounds.length === 0) return <text fg={MUTED}>Waiting...</text>;

    return rounds.map((segs, ri) => {
      const roundNum = ri + 1;

      return (
        <box key={ri} flexDirection="column">
          <text fg={accent}>─── {name} — Round {roundNum} ─── <br /></text>
          {segs.length > 0 ? (
            segs.map((seg, si) =>
              seg.t === "search" ? (
                <text key={si} fg={MUTED}>Search: {seg.v}<br /></text>
              ) : (
                <>
                  <markdown
                    key={si}
                    syntaxStyle={syntaxStyle}
                    content={seg.v}
                    streaming={phase === "debating"}
                  />
                  <text key={`${si}-nl`}>{"\n"}</text>
                </>
              ),
            )
          ) : (
            <text fg={MUTED}>Waiting...</text>
          )}
        </box>
      );
    });
  }

  return (
    <box flexDirection="column" flexGrow={1}>
      {phase === "setup" && (
        <box flexGrow={1} alignItems="center" justifyContent="center">
          <box
            borderStyle="rounded"
            borderColor={PINK}
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
                onSubmit={() => handleEnterOnField(0)}
                onChange={(v) => setTopic(v)}
              />
            </box>
            <box marginTop={1} flexDirection="column">
              <text>Number of Rounds</text>
              <input
                value={roundsStr}
                placeholder="3"
                focused={focusIndex === 1}
                onSubmit={() => handleEnterOnField(1)}
                onChange={(v) => setRoundsStr(v)}
              />
            </box>
            <box marginTop={1} flexDirection="column">
              <text>Min Searches Per Turn</text>
              <input
                value={minSearchesStr}
                placeholder="0"
                focused={focusIndex === 2}
                onSubmit={() => handleEnterOnField(2)}
                onChange={(v) => setMinSearchesStr(v)}
              />
            </box>
            <box marginTop={1}>
              <text fg={SUBTEXT}>Tab to navigate · Enter to start · ESC to quit</text>
            </box>
            {!apiKey && (
              <box marginTop={1}>
                <text fg={CON_RED}>Error: OPENROUTER_API_KEY not set</text>
              </box>
            )}
          </box>
        </box>
      )}

      {phase !== "setup" && (
        <box flexDirection="row" flexGrow={1} overflow="hidden">
          <scrollbox
            key="pro"
            borderStyle="rounded"
            borderColor={PRO_BLUE}
            title={`PRO: That ${topic}`}
            flexGrow={1}
            stickyScroll
            stickyStart="bottom"
            scrollY
            paddingX={2}
            paddingTop={1}
          >
            {renderSegments(proRounds, "pro")}
            {proFeedback && (
              <box flexDirection="column" padding={1}>
                <text>{"\n"}</text>
                <markdown syntaxStyle={syntaxStyle} fg={TEXT} content={proFeedback} streaming={false} />
              </box>
            )}
          </scrollbox>
          <scrollbox
            key="con"
            borderStyle="rounded"
            borderColor={CON_RED}
            title={`NEG: Not that ${topic}`}
            flexGrow={1}
            stickyScroll
            stickyStart="bottom"
            scrollY
            paddingX={2}
            paddingTop={1}
          >
            {renderSegments(conRounds, "con")}
            {conFeedback && (
              <box flexDirection="column" padding={1}>
                <text>{"\n"}</text>
                <markdown syntaxStyle={syntaxStyle} fg={TEXT} content={conFeedback} streaming={false} />
              </box>
            )}
          </scrollbox>
        </box>
      )}

      {phase === "done" && judgeResult && (
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
            borderColor={PINK}
            backgroundColor={SURFACE0}
            padding={2}
            width={76}
            maxHeight={18}
            flexDirection="column"
            title="═══ DEBATE RESULT ═══"
            titleAlignment="center"
          >
            <box marginBottom={1}>
              <text>
                Winner: <span fg={judgeResult.winner === "PRO" ? PRO_BLUE : CON_RED}>{judgeResult.winner}</span>
              </text>
            </box>
              <scrollbox backgroundColor={SURFACE0} scrollY stickyScroll stickyStart="bottom" flexGrow={1} paddingX={1} paddingTop={1}>
                <markdown syntaxStyle={syntaxStyle} fg={TEXT} content={judgeResult.reasoning} streaming={false} />
              </scrollbox>
            <box marginTop={1}>
              <text fg={SUBTEXT}>Press ESC to exit</text>
            </box>
          </box>
        </box>
      )}
    </box>
  );
}
