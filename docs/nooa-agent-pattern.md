# NVIDIA NOOA Agent Pattern Reference

**Status:** Reference only — does **not** affect the live site, AI chat, admin tools, or any production code.

Added: 2026-07-27  
Source: NVIDIA Labs Object-Oriented Agents (NOOA) research preview + Open Secure AI Alliance announcement.

---

## What this is

NOOA (NVIDIA Object-Oriented Agents) is an open-source research framework that treats an AI agent as a normal Python class.

Key ideas:
- The agent is a single Python object
- Methods = capabilities the model can use
- Fields = state the model can see/use
- Docstrings = prompts / instructions
- Type annotations = contracts (validated)
- A method body that is just `...` is filled in at runtime by the LLM

This makes agents feel like regular software: testable, reviewable, versionable, and easier to reason about.

NVIDIA released it as part of the Open Secure AI Alliance work (open models, harnesses, and tools for better AI security and capability).

---

## Why it is in this repo

Kept here as project knowledge so future Grok sessions / development can reference the pattern without breaking anything live.

The current Black Rabbit AI (Porch Mode™) stays exactly as it is — this is just a clean reference + example.

---

## Simple example (structured output + tools + state)

```python
import asyncio
from typing import Literal
from pydantic import BaseModel, Field
from nooa import Agent

# Structured output
class Ticket(BaseModel):
    kind: Literal["refund", "technical", "billing", "other"]
    priority: Literal["low", "medium", "high"]
    summary: str = Field(description="One sentence summary of the issue")
    action: str = Field(description="What the agent recommends doing next")

# The Agent
class SupportAgent(Agent):
    """You are a professional customer support agent for an online store."""

    # Object state (visible to the model)
    store_name: str = "Black Rabbit Outfitters"
    refund_window_days: int = 30

    # Deterministic tool the model can call
    def is_refund_eligible(self, days_since_delivery: int) -> bool:
        """Check if a customer is still within the refund window."""
        return days_since_delivery <= self.refund_window_days

    def get_store_policy(self) -> str:
        """Return the current store refund policy."""
        return f"{self.store_name} allows returns within {self.refund_window_days} days of delivery."

    # Generation method — LLM fills this in at runtime using the docstring
    async def create_ticket(
        self,
        customer_message: str,
        days_since_delivery: int | None = None
    ) -> Ticket:
        """
        Read the customer's message and create a proper support ticket.

        Rules:
        - Use is_refund_eligible() if they mention wanting a refund or return.
        - Use get_store_policy() when needed.
        - Be accurate and professional.
        - Always return a valid Ticket object.
        """
        ...

async def main():
    agent = SupportAgent()

    result = await agent.create_ticket(
        customer_message="Hey, the jacket I ordered arrived damaged and it's been 12 days. Can I get a refund?",
        days_since_delivery=12
    )

    print(result.model_dump_json(indent=2))

asyncio.run(main())
```

---

## Core ideas in plain English

1. **Typed input/output** — Arguments and returns have real types, not free text.
2. **Pass by reference** — The model works with live objects instead of dumping everything into the prompt.
3. **Code as action** — The model can write and run Python to do work.
4. **Programmable loops** — Orchestration is normal Python code.
5. **Explicit object state** — Durable state lives on the agent object.
6. **Model-callable harness APIs** — The model can inspect and manage its own context/history.

These six ideas together are what NVIDIA claims give big jumps in accuracy and big drops in token cost on hard benchmarks (software engineering, cybersecurity, reasoning).

---

## Notes for Black Rabbit

- This is **not** wired into `/api/chat`, the Porch Mode™ assistant, or any admin tools.
- Safe to leave in the repo as future reference.
- If we ever want a more advanced admin-only agent (structured tools, memory, etc.), this pattern is a strong starting point.
- Official code lives at: https://github.com/NVIDIA-NeMo/labs-OO-Agents

---

*Added for project knowledge only. No production impact.*
