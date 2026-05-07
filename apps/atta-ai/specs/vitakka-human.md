# Vitakka

**Pāli: vitakka — directed thought, applied thought.**

*An Atta product.*

---

## What Vitakka is

Vitakka is where thinking lives.

You open it with something on your mind — a decision, a question, a problem worth thinking clearly about. You think. You bring in the AI you need, the artifacts that matter, the tools connected to your life. You leave when the thinking has reached somewhere. The conclusions you accept are remembered.

It is not a chatbot. It is not a search engine. It is not a productivity tool. It is the place where thinking becomes coherent instead of scattered — for one Focus, at a time, with the right intelligence orchestrated invisibly underneath.

> *Vāda is episodic cognition — one question, structured deliberation, one conclusion. Vitakka is situated cognition — a Focus over time, with context, artifacts, accumulated conclusions, and Vāda invoked invisibly when stakes are high.*

Vitakka is one product in the Atta ecosystem. Vāda exists separately as the deliberation engine Vitakka calls when a question deserves adversarial pressure. Sati layers above Vitakka to carry conclusions across Focuses — but Vitakka itself is bounded to one Focus at a time. The composed Atta consumer product is Vitakka + Sati working together.

This document is about Vitakka alone. For the ecosystem and the composed product, see `atta-ecosystem-vision.md`.

---

## Who Vitakka is for

Anyone who has something on their mind that deserves more than a quick answer.

A founder making a product decision. A researcher exploring a complex question. A 12-year-old trying to understand something deeply. A traveller planning a trip. Someone processing a difficult personal situation. A creative working through a brand identity. A developer thinking through an architecture decision before committing.

The point is not the profession. The point is the intention. Vitakka is for anyone who has decided — even for a moment — that this thinking deserves to happen somewhere coherent, not in fifteen browser tabs that forget each other.

---

## Why Vitakka is needed

For 25 years, when you needed to know something, you opened Google. One search engine. One place. The habit was wired into how people thought about finding answers.

That era is over. Today the intelligence is not scattered across websites — it is scattered across AI systems. Claude is exceptional at reasoning. Gemini is excellent at research. DeepSeek surprises you with perspectives neither of the others had. Image models, specialist tools, code reviewers — each genuinely better at specific things. There is no single best AI. There are many.

The era of multiple AI systems has created a new problem: fragmentation. Your thinking is split across tools that do not know about each other, cannot remember what the others concluded, and require you to constantly re-explain everything from zero.

Even within a single tool, the interface was designed for search behavior. Open a chat. Ask something. Get an answer. Ask something else. The interface has no memory of the *thinking* you were doing — only of the messages you sent. Every message looks identical: the architectural decision about your database sits next to the question about the weather in another city. The tool treats them exactly the same way.

This trains a behavior. Even disciplined people start treating AI like a search engine with better answers. You open it, you ask, you move on. The thinking never deepens because the tool never holds the thread.

> *Vitakka is the first system where your thinking gets a place to live. Not for one chat. For one Focus — bounded, intentional, and remembered.*

---

## The Focus — Vitakka's unit of work

Vitakka does not have chats, threads, or projects. It has Focuses.

A Focus is a bounded space for thinking something through. You open it with an intention — a question, a problem, a decision. You think inside it freely, with whatever AI the moment requires, with whatever tools you need. You close it when the thinking has reached somewhere.

A Focus is not a project. No sub-tasks. No deadlines. No status columns. It is not a conversation thread. It is an act of intentional thinking — for anyone, about anything that matters enough to think clearly about.

The conversation inside a Focus drifts freely. Tangents are followed. Irrelevant questions are answered. Exploration is encouraged. But the Focus itself does not drift — it was opened with an intention, and it closes with conclusions tied to that intention.

### The three moments of a Focus

**Open.** When you open Vitakka, you are asked one question: *"What are you thinking about?"* You type one line. The Focus begins. This is the intention that shapes everything that follows.

**Think.** The thinking flows freely. No interruptions. No save buttons. Vitakka orchestrates whatever intelligence each moment requires — routing to Claude, to Gemini, to Vāda for adversarial pressure when stakes are high, to a connected MCP for an external tool, to an image model when something needs to be seen. You experience none of the machinery. You just think.

**Close.** You decide when the Focus is over. You close it. Vitakka presents 2-4 proposed conclusions — the things actually resolved during your thinking. You edit, accept, or reject each one. You can add anything Vitakka missed. Then the Focus closes. Only what you accepted is remembered.

### Two modes — Open Thinking and Project Thinking

A Focus opens in one of two modes depending on what you declare.

**Open Thinking** is for a random thought, a question, something that has no specific home yet. Vitakka provides full thinking support with no prior context. At close, Vitakka evaluates conversation density. If shallow — no conclusions proposed, no friction, the conversation is archived and that is the end of it. If something genuinely emerged, Vitakka asks: *"Something real surfaced here. Would you like to save this as something to come back to?"* You may decline. Nothing is forced.

**Project Thinking** is for a declared subject — a product, a decision, a research question with a name. You name it at the open. The conversation proceeds the same way as Open Thinking, but at close Vitakka proposes 2-4 conclusions automatically. You accept, edit, or reject. Accepted conclusions are saved.

The smart close is the key innovation: Vitakka evaluates what actually happened inside the session, not just what was declared at the start, and responds proportionally. A casual session closes with zero friction. A session where something emerged closes with an offer to make it permanent.

> *The opening question is: "What are you thinking about — or which project are you working on?" Both halves are intentional. Vitakka works for random thought and for deliberate work equally.*

---

## What Vitakka does inside a Focus

### Multiple AI minds, one conversation

Inside a Focus, Vitakka can call any AI you choose. Claude for reasoning. Gemini for research. DeepSeek for a different perspective. An image model when something needs to be seen. The thinking is one conversation. The model that responds in any moment is whichever one the question deserves.

You can also ask Vitakka to run a debate — Vāda invoked invisibly inside the Focus. Two or three reviewers, structured adversarial pressure, synthesis. Not a feature you press a button for. A capability the Focus reaches for when stakes are high enough that one model is not enough. You see the conclusion. You can drill down to the debate if you want.

### Deliberation grounded in your context

Inside a Focus, Vāda does not think in the abstract. It thinks against:

- The artifacts you brought into the Focus — documents, code, images, data
- The MCP-connected tools you have available — Notion pages, GitHub repos, calendar, Maps
- The conversation's own history — what was said earlier in this Focus
- The accumulated conclusions of this Focus — what has already been resolved

A deliberation that runs on a high-stakes question pulls the right context automatically. The reviewer agents reference the artifacts. The conclusions cite them. The debate happens against the real situation, not a sanitized prompt.

### Conversation that doesn't drift away from itself

Long thinking sessions can run hours and produce tens of thousands of words. Without help, they drift. Decisions get buried. Important resolutions happen in the middle of tangents and disappear.

Vitakka's progressive extraction catches conclusions as they form. Every ten exchanges, the system reads the last fifteen and asks: *was something decided here?* If yes, it is saved as a waypoint — invisible to you, available at close. If no, the conversation continues. By the time you close, the system already has a list of candidates. Claude reviews them, removes duplicates, presents 2-4 final conclusions for you to accept.

Nothing is lost. The waypoint extraction catches most resolutions. The raw messages remain in the database as backup. Claude's synthesis falls back to a full scan if waypoints are sparse. Your review screen is the final filter. Four layers of safety, one calm experience.

### Compaction without losing reasoning

A Focus can run for weeks. Eventually, the raw history exceeds practical context windows. The system compacts.

Compaction is not summarization. It preserves *reasoning lineage* — the conclusions reached, the reasoning behind them, the alternatives considered, the evidence that mattered, the open questions. What is discarded: verbatim chat exchanges, redundant artifacts, exhausted threads. What is preserved: the structured cognitive state of the Focus.

This is what makes Vitakka different from any other long-running chat. Most products fail this and become amnesic over time. Vitakka treats compaction as a first-class feature, designed deliberately, because long Focuses are the whole point.

### Three routing patterns — Vitakka always knows where the work goes

Vitakka's job is to think about a problem, with full context and the right intelligence — and then route to wherever the work needs to happen. Three patterns cover all cases.

**Pattern 1 — Routing to an LLM.** The thinking is the work. Claude reasons through the question. If stakes warrant, Vāda invokes for adversarial pressure. The conclusion is reached inside Vitakka. This is the most common pattern.

**Pattern 2 — Routing to a connected MCP.** A specialised tool is connected — Herald for CV-to-job matching, Google Maps for location, GitHub for code review, Notion for an artifact. Vitakka selects it semantically — not because you asked for it, but because it's the right tool for the moment. The tool executes inside the Focus. You never leave.

**Pattern 3 — Routing to an external tool you can't connect.** The right tool for this work has no MCP — it is private, paid, proprietary, or not integrated. Vitakka cannot call it. This is not a failure. Vitakka thinks through the problem with you, identifies the right destination (NotebookLM for a deep document analysis, a paid research database, a domain-specific app), and prepares you to use it well — the right questions, the right context, the right order. You go. You come back, or you don't. Either is fine. The thinking that led you there lives in Vitakka. The execution lives where it belongs.

> *Vitakka is not weak when it cannot connect to a tool. It is doing exactly what it was designed to do — helping you think about the problem and pointing you toward the right place to solve it.*

---

## What using Vitakka actually looks like

### Brand identity for a new product

You are building a new product. You need to think through the brand identity — starting with the logo concept. You open Vitakka.

> Vitakka: *"What are you thinking about — or which project are you working on?"*
>
> You: *"Brand identity for my new product — starting with logo direction."*

Vitakka loads everything it knows about your product from artifacts you have brought in. Your target audience. The positioning you decided on. The aesthetic direction you explored and rejected two months ago. All of it — without you re-explaining.

You think through concepts with Claude. Geometric vs organic. Minimal vs expressive. Claude reasons through the positioning implications. The stakes feel high — you sense this is a decision worth pressure-testing. Vitakka invokes Vāda invisibly. Three reviewers debate the direction. Gemini, GPT, and Grok argue from different angles. Synthesis emerges: minimal, geometric, one strong symbol. The reasoning is preserved.

Now you want to see it. You need an image model — Midjourney is better than Claude for this. Vitakka has it connected. The image model is called from inside the same Focus. Four logo concepts appear. You react to them. Vitakka feeds your reactions back to Claude for reasoning. *"The third concept is strongest — here is why, given your positioning."*

You close the Focus. Vitakka proposes what was reached:

- Logo direction: minimal geometric — single symbol, no wordmark
- Color: monochrome primary, one accent
- Rejected: organic/expressive — wrong signal for the target audience

You accept. You add anything Vitakka missed. The Focus closes.

You did not switch tabs. You did not re-explain context. You did not copy-paste between tools. You did not lose what you concluded. The thinking happened in one place.

### A trip to India

Now a completely different kind of example. Not a product. Not a project. A trip.

You open Vitakka: *"India with Nadia — March 2026."*

Over the next few weeks, every India-related thought comes to this Focus. You ask about the best beaches in Goa. Vitakka knows you prefer quiet over busy from artifacts you brought in. You find a river you want to swim in. You ask how deep it is, whether it is safe. You search for a restaurant in Rishikesh. Vitakka connects to Google Maps. It finds options, filters by what you said you like, shows you the map.

You ask about the history of a temple. You debate whether to rent a motorbike. Claude and Gemini have different views. You decide yes.

The trip happens. You come back. You open Vitakka. The Focus is exactly where you left it. The places you loved. The ones you avoided. The questions you asked before you went. The answers that turned out to be right. The restaurant in Rishikesh you would go back to. The river that was deeper than expected.

Not in a chat thread. Not in a folder. In the Focus — as a coherent memory of what was thought through.

This is not a project. There is no deadline, no deliverable, no outcome. It is a trip — an adventure, a life experience. And Vitakka handles it exactly the same way it handles a product launch. Without folders, without tagging, without organisation overhead. Just by remembering what mattered, connected to the subject that holds it together.

---

## The thinking partner feels alive

Vitakka cannot win on raw model intelligence — Claude and Gemini are better at reasoning than anything Vitakka could build. It cannot win on infrastructure — the big players have infinite scale.

The defensible advantage is **making the thinking visible** — making you feel the system thinking with you. Not by adding personality on the surface. Not by giving it a name or a face. By being honest about what it is doing in any given moment.

### The visible states

The Focus surface is calm. But it is never silent. At any moment, you can see what Vitakka is doing.

When the Focus opens and Vitakka is loading relevant context, you see *"Reading what we have on this..."* — not a spinner, a sentence.

When Vāda is invoked because the question warrants adversarial pressure, you see *"Thinking carefully — running a structured check on this."* Not "running 3-agent adversarial deliberation with reviewer roles." A sentence.

When a debate is in progress, you see two or three named agent cards with round indicators (1/3, 2/3) and each contribution as it streams. You can drill down. You don't have to.

When a tool is being called, you see *"Asking Herald to analyse the job description..."* — named, reasoned, with progress.

When something fails, you see *"Could not reach Herald. Thinking with Claude instead."* Never silent. Never opaque.

> *Animation explains state, not decoration. Every motion has one job: tell you what Vitakka is doing right now. If it could be removed without losing information — remove it.*

### The principle

The product is not simple. The user experience must feel simple. The machinery is sophisticated — multi-vendor routing, progressive extraction, compaction, MCP orchestration, Vāda invocation. The user experience is calm — one Focus, one thinking partner, sentences explaining what is happening, conclusions you accept at close.

This is the hardest design discipline in the build. It applies everywhere. It is the difference between Vitakka feeling like a thinking partner and Vitakka feeling like a configurable AI workspace.

---

## What Vitakka is not

To stay disciplined about scope, Vitakka does not do these things:

- **Cross-Focus memory.** That is Sati's job. Vitakka knows about its own Focus. The composed Atta product (Vitakka + Sati) is what carries thinking from one Focus to the next.
- **Long-term cognitive compounding across many Focuses over months.** Same. That is Sati territory.
- **Fine-tuning on your personal corpus.** That is part of Sati's eventual maturity. Vitakka uses base models inside the Focus.
- **Execution.** Vitakta routes execution out via off-ramps; it does not run code, send emails, manage projects, or update systems directly. Cetana eventually does that. Today, you go to the world.
- **Document editing.** Vitakka is not Notion. Artifacts come in as grounding context, not as primary work surfaces. If you want to edit the artifact, you go to Notion via MCP.
- **Knowledge graph or PKM.** Vitakka is not Obsidian or Roam. The Focus is bounded; you don't graph-navigate between Focuses inside Vitakka.
- **Workflow automation.** Vitakka does not run scheduled jobs, triggers, or agentic loops. Cetana does that, eventually.

Each "not" is deliberate. Vitakka is the cognition layer of a single Focus. Adding any of the above bloats it into a workspace, which is what Atta as a whole explicitly does not want to be.

---

## How Vitakka relates to the rest of Atta

**Vāda** is the deliberation engine. It exists as its own product (live at `vada.attalabs.dev`). Inside Vitakka, Vāda is invoked invisibly when a Focus's question crosses a stakes threshold. Vitakka adds the context grounding (artifacts, MCPs, history) that makes Vāda's debate situated rather than abstract. Vāda's typed conclusions feed back into the Focus.

**Sati** is the memory layer above Vitakka. Vitakka closes a Focus with accepted conclusions. Sati persists those conclusions and surfaces them in future Focuses on related themes. Vitakta standalone does not have Sati — that's why Vitakta shipped on its own teaches you about within-Focus compounding, not across-Focus compounding. The composed Atta product is Vitakta + Sati working together.

**Cetana** receives plans from Vitakka via off-ramps. A Vitakta deliberation can produce *"here's what should happen next"* — that conclusion can be handed to Cetana for deliberation-guided execution. Vitakka thinks; Cetana acts. Cetana is V4+ direction, not in the immediate roadmap.

**MCPs** plug into Vitakka as grounding context (read-from) and execution off-ramps (write-to). Herald, Google Maps, Notion, GitHub, image models, anything with an open MCP. They are not Atta products — they extend the ecosystem.

---

## Why Vitakka ships standalone before Atta

Vitakka is the substantial middle layer in the Atta build sequence. It ships as its own milestone on AttaLabs (`vitakka.attalabs.dev`) before being composed with Sati into the final Atta consumer product.

The reason: Vitakka teaches you whether **within-Focus situated cognition** works. Do users return to a Focus voluntarily? Do artifacts and accumulated conclusions reduce re-explanation? Does the calibration of short-vs-long deliberation feel right? Does compaction preserve the reasoning the user cares about? Does the smart close mechanic feel like zero effort or like homework?

These questions can be answered before Sati exists. Adding Sati's cross-Focus memory to a Vitakka that doesn't yet work would compound the unknowns. Shipping Vitakka first isolates one variable at a time.

The risk that Vitakka-without-Sati feels too thin to validate the thesis is real. The mitigation: Vitakka V1 ships with one Focus initially — the user's current problem — and validates within-Focus compounding before cross-Focus is even on the table. See `atta-build-strategy.md` for the full sequencing logic.

---

## What success looks like

**Within a Focus:** You open it, spend time thinking through a hard problem, and close knowing the thinking actually moved forward. Not "I got a lot of ChatGPT responses." More like "I figured something out, and the conclusions are exactly where I left them."

**Across sessions inside the same Focus:** You come back the next day. The Focus is exactly where you left it. The artifacts are still there. The accumulated conclusions are visible. You don't re-brief the system. You pick up.

**Across many Focuses (with Sati layered on, in the composed Atta product):** Your thirtieth Focus is informed by the previous twenty-nine. New decisions inherit relevant prior reasoning. You develop a track record of your own thinking that is yours to keep, regardless of which provider produced any given conclusion.

This last bullet is the full Atta promise. Vitakka delivers the first two. Sati makes the third real.

---

## What Vitakka is, in one sentence

*Vitakka is a Focus — a bounded space where you think something through, with the right intelligence orchestrated invisibly, with your context grounded, and with the conclusions you accept remembered.*

In four words: *Where the thinking lives.*

---

## Status

**Concept:** Locked May 3, 2026 after round-4 ecosystem clarification. Vitakka is the substantial middle layer of the Atta build sequence — situated cognition between Vāda's episodic primitive and Sati's cross-Focus memory.

**Build status:** Not started. Vāda V1 must validate publicly first, then Vitakka V1 build begins.

**Sequence:** Vāda V1 (production at `vada.attalabs.dev`, validate with non-Dani users) → Vitakka V1 (`vitakka.attalabs.dev`) → Atta V1 (composition with Sati, lives at the consumer product domain — TBD when ready).

**Next document:** the technical specification, `vitakka-spec.md`, written from this. Captures the architecture, the routing rules, the eight UI states, the production requirements, the development plan, and the open questions before code begins.

---

## Related documents

- `atta-ecosystem-vision.md` — what Atta is and where Vitakka sits inside it
- `atta-build-strategy.md` — sequencing, hide-the-work discipline, first-user tests
- `atta-market-research.md` — competitive landscape and what to watch
- `vitakka-spec.md` — technical specification for build (counterpart to this document)
- `vada-state.md` — current state of Vāda V1, the deliberation engine Vitakka invokes
- `cetana-reality-check.md` — the eventual deliberation-guided execution layer
