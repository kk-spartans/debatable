import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions/completions.js";
import { webSearch } from "./search.ts";
import type { DebateResult } from "./debate.ts";

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

const MODEL = "openrouter/owl-alpha";

function makeTool(): ChatCompletionTool {
  return {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for current information relevant to the debate",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query" },
        },
        required: ["query"],
      },
    },
  };
}

async function speak(
  openai: OpenAI,
  sideMessages: ChatCompletionMessageParam[],
  opponentHistory: ChatCompletionMessageParam[],
  side: "pro" | "con",
  round: number,
  totalRounds: number,
  minSearches: number,
  topic: string,
  onText?: (text: string) => void,
  onSearch?: (query: string) => void,
): Promise<string> {
  const messages: ChatCompletionMessageParam[] = [...sideMessages];

  const lastOpponentMsg = [...opponentHistory].reverse().find(
    (m): m is ChatCompletionMessageParam & { role: "assistant"; content: string } =>
      m.role === "assistant" && typeof m.content === "string",
  );

  if (!lastOpponentMsg || (round === 1 && side === "pro")) {
    const forOrAgainst = side === "pro" ? "TRUE" : "FALSE";
    messages.push({
      role: "user",
      content: `The proposition is: "${topic}". Argue that this proposition is ${forOrAgainst}. Begin by searching for evidence to support your case.`,
    });
  } else {
    const proOrAgainst = side === "pro" ? "FOR" : "AGAINST";
    messages.push({
      role: "user",
      content: `The opposing side argued: "${lastOpponentMsg.content.substring(0, 1500)}". Search the web for new evidence, then respond to their points and continue arguing ${proOrAgainst} the proposition.`,
    });
  }

  const tool = makeTool();
  let searchCount = 0;
  let fullContent = "";
  let supportsRequired = true;

  while (true) {
    const needSearches = searchCount < minSearches;

    let toolChoice: "required" | "auto" = needSearches && supportsRequired ? "required" : "auto";

    let stream;
    try {
      stream = await openai.chat.completions.create({
        model: MODEL,
        messages,
        stream: true,
        tools: [tool],
        tool_choice: toolChoice,
      });
    } catch (e) {
      if (toolChoice === "required" && e instanceof Error && (e.message.includes("tool_choice") || e.message.includes("No endpoints"))) {
        supportsRequired = false;
        toolChoice = "auto";
        stream = await openai.chat.completions.create({
          model: MODEL,
          messages,
          stream: true,
          tools: [tool],
          tool_choice: toolChoice,
        });
      } else {
        throw e;
      }
    }

    const toolCallAccumulators: Record<number, { id: string; name: string; args: string }> = {};
    let content = "";
    let finished = false;

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;
      const delta = choice.delta;
      const finishReason = choice.finish_reason;

      if (delta?.content) {
        content += delta.content;
        onText?.(delta.content);
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0;
          if (!toolCallAccumulators[idx]) {
            toolCallAccumulators[idx] = { id: tc.id ?? "", name: tc.function?.name ?? "", args: tc.function?.arguments ?? "" };
          } else {
            if (tc.id) toolCallAccumulators[idx]!.id += tc.id;
            if (tc.function?.name) toolCallAccumulators[idx]!.name += tc.function.name;
            if (tc.function?.arguments) toolCallAccumulators[idx]!.args += tc.function.arguments;
          }
        }
      }

      if (finishReason === "tool_calls") {
        const toolCalls = Object.values(toolCallAccumulators).map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: { name: tc.name, arguments: tc.args },
        }));

        messages.push({
          role: "assistant",
          content: content || null,
          tool_calls: toolCalls,
        } as ChatCompletionMessageParam);

        for (const tc of Object.values(toolCallAccumulators)) {
          searchCount++;
          let result: string;
          try {
            const parsed = JSON.parse(tc.args) as { query?: string };
            const query = parsed.query ?? tc.args;
            onSearch?.(query);
            result = await webSearch(query);
          } catch (e: unknown) {
            result = `Search error: ${e instanceof Error ? e.message : String(e)}`;
          }
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: result,
          } as ChatCompletionMessageParam);
        }

        finished = false;
        break;
      }

      if (finishReason === "stop" || finishReason === "length") {
        if (searchCount < minSearches) {
          if (content) {
            messages.push({
              role: "assistant",
              content,
            } as ChatCompletionMessageParam);
            messages.push({
              role: "user",
              content: "You haven't searched enough yet. Use the web_search tool to find evidence before continuing.",
            } as ChatCompletionMessageParam);
          }
          break;
        }
        fullContent += content;
        if (content && !content.endsWith("\n")) fullContent += "\n";
        finished = true;
        break;
      }
    }

    if (finished) break;
  }

  return fullContent;
}

async function generateFeedback(
  openai: OpenAI,
  forSide: "pro" | "con",
  allRounds: string[],
  onFeedback?: (text: string) => void,
): Promise<string> {
  const targetSide = forSide === "pro" ? "NEG" : "PRO";
  const systemMsg: ChatCompletionMessageParam = {
    role: "system",
    content:
      "You are a helpful debate coach. Provide constructive, specific feedback focused on argumentation, evidence use, and persuasion. Do not use any tools.",
  };
  const userMsg: ChatCompletionMessageParam = {
    role: "user",
      content: `Review the ${targetSide} debater's arguments below and provide constructive feedback on how they could improve. Be specific about argumentation, evidence use, and persuasion.\n\n${targetSide}'s arguments:\n${allRounds.join("\n\n")}`,
  };

  const stream = await openai.chat.completions.create({
    model: MODEL,
    messages: [systemMsg, userMsg],
    stream: true,
  });

  let content = "";
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? "";
    content += text;
    onFeedback?.(text);
  }

  return content;
}

async function judge(
  openai: OpenAI,
  topic: string,
  proRounds: string[],
  conRounds: string[],
  onJudgeResult?: (winner: string, reasoning: string) => void,
): Promise<{ winner: string; reasoning: string }> {
  const systemMsg: ChatCompletionMessageParam = {
    role: "system",
    content:
      "You are an impartial debate judge. Evaluate the debate based on evidence, logic, persuasiveness, and rebuttals. Pick a clear winner and provide detailed reasoning.",
  };
  const userMsg: ChatCompletionMessageParam = {
    role: "user",
    content: `Debate topic: "${topic}"\n\nPRO arguments:\n${proRounds.join("\n\n")}\n\nNEG arguments:\n${conRounds.join("\n\n")}\n\nWho won this debate? Start your response with "PRO" or "NEG" on the first line, followed by your detailed reasoning.`,
  };

  const stream = await openai.chat.completions.create({
    model: MODEL,
    messages: [systemMsg, userMsg],
    stream: true,
  });

  let content = "";
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? "";
    content += text;
    onJudgeResult?.("", text);
  }

  const firstLine = content.split("\n")[0] ?? "";
  const winner = firstLine.includes("PRO") && !firstLine.includes("NEG") ? "PRO" : "NEG";
  onJudgeResult?.(winner, content);
  return { winner, reasoning: content };
}

export async function runDebate(
  topic: string,
  rounds: number,
  minSearches: number,
  openai: OpenAI,
  callbacks?: DebateCallbacks,
): Promise<DebateResult> {
  const proSystem: ChatCompletionMessageParam = {
    role: "system",
    content: `You are arguing FOR the proposition: "${topic}". Defend it with evidence, logic, and persuasive arguments. You MUST use the web_search tool before every response to gather current evidence. Search at least ${Math.max(minSearches, 1)} time(s). Do not mention being an AI or language model.`,
  };
  const conSystem: ChatCompletionMessageParam = {
    role: "system",
    content: `You are arguing AGAINST the proposition: "${topic}". Refute it with evidence, logic, and persuasive counter-arguments. You MUST use the web_search tool before every response to gather current evidence. Search at least ${Math.max(minSearches, 1)} time(s). Do not mention being an AI or language model.`,
  };

  const proHistory: ChatCompletionMessageParam[] = [proSystem];
  const conHistory: ChatCompletionMessageParam[] = [conSystem];

  const proRounds: string[] = [];
  const conRounds: string[] = [];

  callbacks?.onStatus?.("Debate starting...");

  for (let round = 1; round <= rounds; round++) {
    callbacks?.onRound?.(round, rounds);
    callbacks?.onStatus?.(`Round ${round}/${rounds} - PRO speaking`);

    const proResult = await speak(
      openai, proHistory, conHistory, "pro", round, rounds, minSearches, topic,
      callbacks?.onProText, callbacks?.onProSearch,
    );
    proRounds.push(proResult);
    proHistory.push({ role: "assistant", content: proResult });

    if (round < rounds) {
    callbacks?.onStatus?.(`Round ${round}/${rounds} - NEG speaking`);
      const conResult = await speak(
        openai, conHistory, proHistory, "con", round, rounds, minSearches, topic,
        callbacks?.onConText, callbacks?.onConSearch,
      );
      conRounds.push(conResult);
      conHistory.push({ role: "assistant", content: conResult });
    }
  }

  callbacks?.onStatus?.("PRO writing constructive feedback...");
  const proFeedback = await generateFeedback(openai, "pro", conRounds, callbacks?.onProFeedback);

   callbacks?.onStatus?.("NEG writing constructive feedback...");
  const conFeedback = await generateFeedback(openai, "con", proRounds, callbacks?.onConFeedback);

  callbacks?.onStatus?.("Judge evaluating...");
  const judgeResult = await judge(openai, topic, proRounds, conRounds, callbacks?.onJudgeResult);

  callbacks?.onStatus?.("◆ Debate concluded");
  return {
    topic,
    rounds,
    proRounds,
    conRounds,
    proFeedback,
    conFeedback,
    judgeResult,
  };
}
