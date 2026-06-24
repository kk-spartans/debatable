const spec = `name "debatable"
bin "debatable"
about "An AI debate between PRO and NEG on a given topic"

flag "-r --rounds <n>" help="Number of debate rounds" default="3"
flag "-m --min-searches <n>" help="Minimum searches per turn" default="1"
flag "-k --api-key <key>" help="API key (passed directly)"
flag "--api-key-env <var>" help="Environment variable name containing the API key" default="OPENROUTER_API_KEY"
flag "--model <model>" help="Default model for all sides"
flag "--pro-model <model>" help="Override model for the PRO side"
flag "--con-model <model>" help="Override model for the NEG side"
flag "--judge-model <model>" help="Override model for judging and feedback"
flag "--searxng-url <url>" help="Base URL for SearXNG instance"
flag "-o --output <path>" help="Output markdown file path"
flag "--headless" help="Run in headless mode (no TUI)"
flag "--completions <shell>" help="Print shell completions and exit"
flag "--version" help="Show version number and exit"
flag "-h --help" help="Show this help message and exit"

arg "[topic]" help="Debate topic"
`;

const usageShellMap: Record<string, string> = {
  bash: "bash",
  zsh: "zsh",
  fish: "fish",
  powershell: "powershell",
  nushell: "nu",
};

export async function generateCompletions(shell: string): Promise<string | null> {
  const usageShell = usageShellMap[shell];
  if (!usageShell) return null;

  try {
    const proc = Bun.spawn(["usage", "g", "completion", usageShell, "debatable", "-f", "-"], {
      stdin: "pipe",
    });
    await proc.stdin.write(spec);
    await proc.stdin.end();
    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    if (exitCode !== 0) return null;
    return output;
  } catch {
    return null;
  }
}
