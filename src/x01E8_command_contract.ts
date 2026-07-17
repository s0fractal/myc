// Shared CLI command contract. Registries own behavior and permissions; this
// type keeps their coarse capability projection consistent without coupling
// local handlers to the shell dispatcher.

export type CommandEffect = "read" | "effect" | "serve";
