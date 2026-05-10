# Ratification Queue

Append-only record of decisions and Tier 3 merges awaiting Principal ratification. Items are appended by the Team Leader before a ratification window and marked resolved after the Principal acts.

---

## Format

```
### [D-NNN or PR title] — [one-line description]
- Type: [1/2] | Tier: [0/1/3] | Authored: [YYYY-MM-DD]
- Decision log: [link or "decisions.md D-NNN"]
- Why it needs ratification: [one sentence]
- Deadline context: [any urgency or downstream block]
- Status: PENDING
```

When resolved, add below the entry:
```
- Resolved: [YYYY-MM-DD] | Principal action: [ratified / rejected / deferred] | Notes: [if any]
- Status: RESOLVED
```

---

## Pending items

None — queue starts empty after v3 operational model ship.

---

## Resolved items archive

None yet.
