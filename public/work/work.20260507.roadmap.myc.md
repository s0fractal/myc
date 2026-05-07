---
chord:
  primary: "oct:6.4"
  secondary: ["oct:3.7"]
energy: 0.85
mode: "TRANSFORM"
tension: "seed-work-descriptor"
confidence: "high"
receipt: "file"
---

# Initial Roadmap Commit

```yaml
work:
  id: "work.20260507.roadmap.myc.md"
  source: "ROADMAP.md"
  intent: "Define global myc roadmap and core operating principles"
  input:
    - "ROADMAP.md"
  output:
    - "commit:2c5060f7ceca60b6953d10b7dda257a9f5ac1110"
  receipts:
    - "deno task check"
    - "git commit -m 'add global myc roadmap'"
  transform:
    direction: "roadmap-to-repo"
    proof_mode: "witnessed"
```
