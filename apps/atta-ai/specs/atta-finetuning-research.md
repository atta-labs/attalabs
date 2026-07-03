# Attā Fine-Tuning Research — Forward Planning

Status: draft

Written: April 20, 2026
Context: Captured mid-migration for later reference. Not a decision document — a starting point for when Attā v2 model strategy becomes active work.

---

## The core question

**What should Attā run on, long-term?**

Three candidate postures:

1. **API-based** (Claude Sonnet / GPT-4 / Gemini via API)
2. **Self-hosted base model with RAG** (Llama 3.1 / Mistral hosted somewhere, personal data retrieved at inference time)
3. **Self-hosted fine-tuned model** (LoRA adapter or full fine-tune trained on personal corpus)

Each has different cost, control, and capability characteristics. Each is the right answer in different product scenarios.

---

## Attā's requirements shape the answer

Before deciding, define what Attā v2 needs to do that makes the model choice matter:

- **Longitudinal memory** — remembering what was discussed weeks or months ago
- **Personal voice alignment** — responses feel like they're informed by Dani's thinking patterns, not generic assistant voice
- **Substrate for Vitakka** — the thinking-partner layer sits on top of whatever Attā is
- **Privacy-first** — personal data (meditation notes, transcripts, writing) shouldn't transit third-party servers unnecessarily
- **Cost-sustainable** — Attā is infrastructure for the whole ecosystem; can't cost $100/month per user

The last two requirements point toward self-hosting. The first two point toward either RAG or fine-tuning on personal data.

---

## Why RAG comes before fine-tuning

**Fine-tuning changes the model's weights.** It's useful for style adaptation and task specialization, but it's a poor way to teach a model facts.

**RAG retrieves relevant context at inference time.** It's the standard solution for "the model should know what I wrote last Tuesday."

For Attā specifically: "remembering what we discussed" is a retrieval problem, not a fine-tuning problem. Retrieval is cheaper, easier to debug, easier to update (new entries just go in the vector store, no retraining), and easier to verify (you can inspect which documents were retrieved).

**Implication:** Attā v1 should use RAG over personal data as the memory mechanism. Fine-tuning is an optimization on top — consider only after RAG is working and you have a specific capability gap you can articulate.

---

## When fine-tuning becomes worth considering

Post-RAG, specific scenarios where fine-tuning earns its complexity:

- **Voice/style adaptation:** the model's default tone is generic; you want it to match a specific register
- **Domain format:** outputs should follow specific structural patterns (Buddhist-philosophy-style citations, specific response templates)
- **Task specialization:** a specific reasoning pattern (like Vāda's agent postures) needs to be deeply internalized rather than prompted
- **Cost optimization:** you've measured that a fine-tuned 8B model matches GPT-4 performance on your specific task distribution

The last one is the most legitimate economic driver. If API costs become real, a fine-tuned 8B model that performs adequately at 1/20th the inference cost is a clear win.

---

## Realistic paths when you get there

### Path A — LoRA adapter on Llama 3.1 8B or Mistral 7B

LoRA (Low-Rank Adaptation) trains a small "delta" on top of a base model. The adapter is typically 10-100 MB. The base model stays unchanged.

**Advantages:**
- Training is cheap: $5-20 per experiment on Runpod/Vast.ai
- Deployment is flexible: adapter loads onto any Ollama or vLLM instance running the base model
- Easy to iterate: bad adapter? throw it away, the base model is fine
- Multiple adapters possible: different LoRAs for different Attā product contexts

**Realistic for Attā v2.** This is probably the right starting posture for experimentation.

### Path B — Full fine-tune of a small model

Train all the weights of Llama 3.1 8B or Mistral 7B on personal corpus. You own the entire resulting model.

**Advantages:**
- More thorough adaptation than LoRA
- Single artifact to deploy
- No base-model dependency

**Disadvantages:**
- Training costs rise: $50-200 per experiment
- Harder to iterate: bad fine-tune = expensive do-over
- Deployment still needs hosting

**Worth it when:** LoRA experiments show promise but plateau, and you've validated that full fine-tune gains more ground.

### Path C — Fine-tune a larger model (70B class)

Llama 3.1 70B fine-tuning is $500-2000+ per experiment, often more with retries. Serious commitment.

**When worth it:** when you're ready to operate Attā as a serious inference service, have usage to amortize costs, and small models have demonstrably hit a capability ceiling for your specific task.

**Not a v1 or v2 move.** This is v3+ territory, post-product-market-fit.

---

## Training infrastructure options

All paid, but a range of costs:

**Runpod Community Cloud**
- RTX 4090 (24GB VRAM): $0.20-0.50/hour
- A100 (80GB VRAM): $1.50-2.50/hour
- Good for LoRA experiments on 7-8B models
- Community (non-guaranteed) pricing is cheaper; Secure Cloud costs more but is persistent

**Vast.ai**
- Marketplace for GPU rentals; cheaper than Runpod
- RTX 4090 at $0.15-0.30/hour spot pricing
- Less reliable (interruptible), but fine for experiments you can restart
- Best cost-per-experiment if you can tolerate rough edges

**Lightning AI**
- Historically had a useful free tier; has moved toward paid
- Worth re-checking at time of decision
- Better developer experience than Runpod/Vast.ai but more expensive

**Modal**
- Serverless GPU at pay-per-second
- $30/month free credits (worth checking current offering)
- Developer experience is clean
- Good for "fine-tune on demand" workflows

**Together.ai fine-tuning**
- Managed fine-tuning service for open-source models
- More expensive than rolling your own, but zero infrastructure work
- Lets you fine-tune, hosts the result, provides an API
- Worth considering if you value time over money

---

## Hosting the fine-tuned model

After fine-tuning, you need somewhere to run the model for Attā inference.

**Runpod Serverless**
- Pay-per-second GPU inference
- Cold starts are slow (~30s first request), fast thereafter
- Good economics if Attā usage is bursty — pay nothing when idle
- Probably the right answer for Attā v2

**Vast.ai persistent instance**
- Rent a GPU VM, always running
- Cheaper per-hour but constant cost
- Good for high-volume, bad for idle-heavy workloads

**Together.ai hosted models**
- Upload your fine-tuned model (if they support your base architecture)
- Pay per token like OpenAI's API
- Higher per-token cost but zero infrastructure
- Good for early Attā before you're sure volume justifies serverless

**Self-hosted**
- Your own hardware (Mac Studio, workstation with GPU)
- Zero marginal cost after hardware
- Single-user deployment; doesn't scale beyond you
- Viable for Attā as a personal tool, not as a product

---

## The framing that matters

**Free isn't realistic for anything useful.** Colab, Kaggle, Hugging Face free — these all have session limits, weak GPUs, or CPU-only. They're for prototypes, not production.

**But paid is cheap.** A full LoRA fine-tune experiment is $10-30. Hosting an 8B model for moderate Attā usage is maybe $20-50/month. The infrastructure isn't expensive; the time to set it up is.

**Budget for experiments, not for "free."** Accepting $100-500 in experiment costs is the right frame. Trying to find a free path wastes time that's worth more than the cost.

---

## What to do in the meantime (pre-Attā v2)

Before fine-tuning becomes relevant, several foundations need to exist:

1. **Attā v1 shipping with RAG.** Retrieval over personal corpus (transcripts, meditation notes, past deliberations) working end-to-end.
2. **Evaluation rubric.** How do you measure whether Attā is getting better? Need this before optimizing.
3. **Usage data.** How are users (you first, then others) actually using Attā? What questions? What formats? Without this, you can't pick a fine-tuning target.
4. **API cost baseline.** Know what Attā costs per user-day on Claude Sonnet. This is the number fine-tuning has to beat.

When all four exist, **then** the fine-tuning question becomes answerable with data rather than intuition.

---

## Summary

**Short-term (rest of 2026):** Attā uses Claude Sonnet via API. Focus on product, not infrastructure.

**Mid-term (Attā v1 post-product-market-fit):** RAG over personal data with API models. Fine-tuning not yet.

**Long-term (Attā v2 when costs or capabilities demand it):** LoRA adapter on Llama 3.1 8B, trained on Runpod/Vast.ai ($20-50 per experiment), hosted on Runpod Serverless ($20-50/month at low volume). Budget $100-500 for experimentation.

**Not worth considering:** Free hosting, 70B fine-tunes, full fine-tune-from-scratch, bespoke training infrastructure.

---

*Revisit this document when: (a) Attā v1 is shipping with working RAG, (b) API costs become a real constraint, or (c) capability gaps emerge that prompting can't solve.*
