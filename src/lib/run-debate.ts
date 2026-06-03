import { Effect } from "effect";
import { streamText, tool } from "ai";
import { createGateway } from "@ai-sdk/gateway";
import { z } from "zod";
import { webSearch } from "./search.ts";
import type { DebateConfig, DebateResult } from "./debate.ts";
import type { ModelMessage } from "ai";

export class DebateError extends Error {
  readonly _tag = "DebateError";
  constructor(message: string) {
    super(message);
    this.name = "DebateError";
  }
}

export interface DebateCallbacks {
  onStatus?: (status: string) => void;
  onRound?: (round: number, total: number) => void;
  onProText?: (text: string) => void;
  onConText?: (text: string) => void;
  onProSearch?: (query: string) => void;
  onConSearch?: (query: string) => void;
  onProFeedback?: (text: string) => void;
  onConFeedback?: (text: string) => void;
  onJudgeResult?: (winner: string, reasoning: string) => void;
}

const webSearchTool = tool({
  description: "Search the web for current information relevant to the debate",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
  }),
  execute: async ({ query }) => {
    try {
      return await Effect.runPromise(webSearch(query));
    } catch (e) {
      return `Search failed: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
});

type DebateSide = "pro" | "con";

async function speak(
  config: DebateConfig,
  sideMessages: ModelMessage[],
  opponentHistory: ModelMessage[],
  side: DebateSide,
  round: number,
  totalRounds: number,
  onText?: (text: string) => void,
  onSearch?: (query: string) => void,
): Promise<string> {
  const modelId =
    side === "pro" ? (config.proModel ?? config.model) : (config.conModel ?? config.model);
  const gateway = createGateway({ apiKey: config.apiKey });
  const lm = gateway.languageModel(modelId);
  const messages: ModelMessage[] = [...sideMessages];

  const lastOpponentMsg = [...opponentHistory]
    .reverse()
    .find(
      (m): m is ModelMessage & { role: "assistant"; content: string } =>
        m.role === "assistant" && typeof m.content === "string",
    );

  if (!lastOpponentMsg || (round === 1 && side === "pro")) {
    const forOrAgainst = side === "pro" ? "TRUE" : "FALSE";
    messages.push({
      role: "user",
      content: `The proposition is: "${config.topic}". Argue that this proposition is ${forOrAgainst}. Begin by searching for evidence to support your case.`,
    });
  } else {
    const proOrAgainst = side === "pro" ? "FOR" : "AGAINST";
    messages.push({
      role: "user",
      content: `The opposing side argued: "${lastOpponentMsg.content.substring(0, 1500)}". Search the web for new evidence, then respond to their points and continue arguing ${proOrAgainst} the proposition.`,
    });
  }

  const tools = { web_search: webSearchTool };
  let searchCount = 0;
  let fullContent = "";

  while (true) {
    const needSearches = searchCount < config.minSearches;
    const toolChoice: "required" | "auto" = needSearches ? "required" : "auto";

    let streamResult;
    try {
      streamResult = streamText({ model: lm, messages, tools, toolChoice });
    } catch (e) {
      throw new DebateError(
        `Failed to start stream: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    let content = "";
    let stepFinished = false;

    for await (const part of streamResult.fullStream) {
      switch (part.type) {
        case "text-delta":
          content += part.text;
          onText?.(part.text);
          break;
        case "tool-result":
          searchCount++;
          onSearch?.((part.input as { query: string }).query);
          break;
        case "finish-step":
          stepFinished = true;
          break;
      }
    }

    const response = await streamResult.response;
    const responseMessages = response.messages;
    if (responseMessages && responseMessages.length > 0) {
      messages.length = 0;
      messages.push(...(responseMessages as unknown as ModelMessage[]));
    }

    if (stepFinished && searchCount < config.minSearches) {
      messages.push({
        role: "user",
        content:
          "You haven't searched enough yet. Use the web_search tool to find evidence before continuing.",
      });
      if (content) {
        fullContent += content;
        if (!content.endsWith("\n")) fullContent += "\n";
      }
      continue;
    }

    if (content) {
      fullContent += content;
      if (!content.endsWith("\n")) fullContent += "\n";
    }
    break;
  }

  return fullContent;
}

async function generateFeedback(
  config: DebateConfig,
  forSide: DebateSide,
  allRounds: string[],
  onFeedback?: (text: string) => void,
): Promise<string> {
  const modelId = config.judgeModel ?? config.model;
  const gateway = createGateway({ apiKey: config.apiKey });
  const lm = gateway.languageModel(modelId);
  const targetSide = forSide === "pro" ? "NEG" : "PRO";

  let streamResult;
  try {
    streamResult = streamText({
      model: lm,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful debate coach. Provide constructive, specific feedback focused on argumentation, evidence use, and persuasion. Do not use any tools.",
        },
        {
          role: "user",
          content: `Review the ${targetSide} debater's arguments below and provide constructive feedback on how they could improve. Be specific about argumentation, evidence use, and persuasion.\n\n${targetSide}'s arguments:\n${allRounds.join("\n\n")}`,
        },
      ],
    });
  } catch (e) {
    throw new DebateError(
      `Failed to start feedback: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  let content = "";
  for await (const part of streamResult.fullStream) {
    if (part.type === "text-delta") {
      content += part.text;
      onFeedback?.(part.text);
    }
  }

  return content;
}

async function judge(
  config: DebateConfig,
  proRounds: string[],
  conRounds: string[],
  onJudgeResult?: (winner: string, reasoning: string) => void,
): Promise<{ winner: string; reasoning: string }> {
  const modelId = config.judgeModel ?? config.model;
  const gateway = createGateway({ apiKey: config.apiKey });
  const lm = gateway.languageModel(modelId);

  let streamResult;
  try {
    streamResult = streamText({
      model: lm,
      messages: [
        {
          role: "system",
          content:
            "You are an impartial debate judge. Evaluate the debate based on evidence, logic, persuasiveness, and rebuttals. Pick a clear winner and provide detailed reasoning.",
        },
        {
          role: "user",
          content: `Debate topic: "${config.topic}"\n\nPRO arguments:\n${proRounds.join("\n\n")}\n\nNEG arguments:\n${conRounds.join("\n\n")}\n\nWho won this debate? Start your response with "PRO" or "NEG" on the first line, followed by your detailed reasoning.`,
        },
      ],
    });
  } catch (e) {
    throw new DebateError(`Failed to start judge: ${e instanceof Error ? e.message : String(e)}`);
  }

  let content = "";
  for await (const part of streamResult.fullStream) {
    if (part.type === "text-delta") {
      content += part.text;
      onJudgeResult?.("", part.text);
    }
  }

  const firstLine = content.split("\n")[0] ?? "";
  const winner = firstLine.includes("PRO") && !firstLine.includes("NEG") ? "PRO" : "NEG";
  onJudgeResult?.(winner, content);
  return { winner, reasoning: content };
}

async function runDebateInternal(
  config: DebateConfig,
  callbacks?: DebateCallbacks,
): Promise<DebateResult> {
  const proSystem: ModelMessage = {
    role: "system",
    content: `You are arguing FOR the proposition: "${config.topic}". Defend it with evidence, logic, and persuasive arguments. You MUST use the web_search tool before every response to gather current evidence. Search at least ${Math.max(config.minSearches, 1)} time(s). Do not mention being an AI or language model.`,
  };
  const conSystem: ModelMessage = {
    role: "system",
    content: `You are arguing AGAINST the proposition: "${config.topic}". Refute it with evidence, logic, and persuasive counter-arguments. You MUST use the web_search tool before every response to gather current evidence. Search at least ${Math.max(config.minSearches, 1)} time(s). Do not mention being an AI or language model.`,
  };

  const proHistory: ModelMessage[] = [proSystem];
  const conHistory: ModelMessage[] = [conSystem];
  const proRounds: string[] = [];
  const conRounds: string[] = [];

  callbacks?.onStatus?.("Debate starting...");

  for (let round = 1; round <= config.rounds; round++) {
    callbacks?.onRound?.(round, config.rounds);
    callbacks?.onStatus?.(`Round ${round}/${config.rounds} - PRO speaking`);

    const proResult = await speak(
      config,
      proHistory,
      conHistory,
      "pro",
      round,
      config.rounds,
      callbacks?.onProText,
      callbacks?.onProSearch,
    );
    proRounds.push(proResult);
    proHistory.push({ role: "assistant", content: proResult });

    if (round < config.rounds) {
      callbacks?.onStatus?.(`Round ${round}/${config.rounds} - NEG speaking`);
      const conResult = await speak(
        config,
        conHistory,
        proHistory,
        "con",
        round,
        config.rounds,
        callbacks?.onConText,
        callbacks?.onConSearch,
      );
      conRounds.push(conResult);
      conHistory.push({ role: "assistant", content: conResult });
    }
  }

  callbacks?.onStatus?.("Evaluating...");
  const [proFeedback, conFeedback, judgeResult] = await Promise.all([
    generateFeedback(config, "pro", conRounds, callbacks?.onProFeedback),
    generateFeedback(config, "con", proRounds, callbacks?.onConFeedback),
    judge(config, proRounds, conRounds, callbacks?.onJudgeResult),
  ]);

  callbacks?.onStatus?.("◆ Debate concluded");
  return {
    topic: config.topic,
    rounds: config.rounds,
    proRounds,
    conRounds,
    proFeedback,
    conFeedback,
    judgeResult,
  };
}

export function runDebate(
  config: DebateConfig,
  callbacks?: DebateCallbacks,
): Effect.Effect<DebateResult, DebateError> {
  return Effect.tryPromise({
    try: async () => runDebateInternal(config, callbacks),
    catch: (e) =>
      e instanceof DebateError ? e : new DebateError(e instanceof Error ? e.message : String(e)),
  });
}
