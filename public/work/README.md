# Work Descriptors

Work Descriptors (`WorkDescriptor`) map the lifecycle of local repository
changes into the MYC graph.

Rather than modeling the entire Git history as an exhaustive ontology, a
`WorkDescriptor` acts as a targeted, verifiable bridge. It maps a high-level
semantic intent (e.g., an item from `ROADMAP.md`) to specific cryptographic
receipts (such as a `git commit` hash and a `deno task check` execution).

This ensures that the process of working on the repository itself becomes a
verifiable artifact within the MYC architecture.
