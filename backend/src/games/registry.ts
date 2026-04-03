import type { GamePlugin } from "./GamePlugin.js";
import { RockPaperScissors } from "./RockPaperScissors.js";

const registry = new Map<string, GamePlugin>();

export function registerGame(plugin: GamePlugin): void {
  if (registry.has(plugin.id)) {
    throw new Error(`Game ${plugin.id} already registered`);
  }
  registry.set(plugin.id, plugin);
}

export function getGame(id: string): GamePlugin | undefined {
  return registry.get(id);
}

export function listGames(): GamePlugin[] {
  return [...registry.values()];
}

registerGame(RockPaperScissors);
