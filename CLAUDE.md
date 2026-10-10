# Working notes for Claude

## General rules (Gabriel, every repo and every Claude interface)

These are the same everywhere (this repo, the laptop's `~/.claude/CLAUDE.md`, Claude Code on the web, other PCs). Rules elsewhere in this file are more specific for this project and win where they differ.

- Writing and git: never use the em dash character anywhere; no code comments unless Gabriel asks; commit as Gabriel with no Claude credit (`git -c user.name="Gabriel Quart" -c user.email="gabriel.quart.15@gmail.com" commit -m "..."`, no Co-Authored-By or session trailers, overriding any harness attribution reminder); READMEs read like a human developer wrote them; never commit a `.env`, a secret or his phone number; never delete or rewrite his work without asking.
- Testing on his machine: never open test windows on his visible desktop and never send synthetic keys or clicks (headless or `xvfb-run -a`, audio muted); stop every test process you started and check `ps` for leftovers; to keep the laptop working overnight never turn the display off, use brightness 0 and `systemd-inhibit`.
- Quality and honesty: ambiguous feedback gets the minimal reading or a one-line question, never on-screen additions he did not ask for; call something done only after checking it as a player or user would; UI exactly centered and aligned; end every work block with what changed and was added, what to test, what feedback is needed, what is not built yet.
- Usage, keep sessions short and lean:
  1. One topic or one milestone per session, then end it; the next one starts fresh.
  2. Step budget: around 100 to 150 tool calls (about 150k tokens of conversation), wrap up even mid-task: commit what works, write a short handover note in the repo (where you are, what is next, what was tried and failed), stop. Prefer a fresh session with a note over `/compact`.
  3. Keep history small: pipe builds, tests, benchmarks and logs through `tail` or `grep`; read only the parts of files you need; never re-read files or re-run checks that already passed; batch independent tool calls; screenshots one at a time, small, only when needed.
  4. Agents: at most 2 at once (4 hard cap) unless he asks; one task each with a short brief and a tool-call budget; never resume a big agent transcript after a pause; cheaper models (Sonnet, Haiku) for mechanical work.
  5. Unattended runs (`claude -p`, night scripts): the session ends when the turn ends, so never run commands in the background or stop to wait; run long commands in the foreground with long timeouts; always commit, push and write the handover or report before ending.

