import type { GameDefinition } from '@recess/game-core';
import { games, type Database } from '@recess/database';

import { wordBattleGame } from '@recess/game-word-battle';
import { mancalaGame } from '@recess/game-mancala';
import { whotGame } from '@recess/game-whot';

import { demoGame } from './demo-game.js';

export class GameRegistry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private registeredGames = new Map<string, GameDefinition<any, any, any>>();

  constructor() {
    this.register(demoGame);
    this.register(wordBattleGame);
    this.register(mancalaGame);
    this.register(whotGame);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register(definition: GameDefinition<any, any, any>): void {
    this.registeredGames.set(definition.id, definition);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(gameId: string): GameDefinition<any, any, any> | undefined {
    return this.registeredGames.get(gameId);
  }

  has(gameId: string): boolean {
    return this.registeredGames.has(gameId);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  list(): GameDefinition<any, any, any>[] {
    return Array.from(this.registeredGames.values());
  }

  async syncCatalogToDatabase(db: Database): Promise<void> {
    for (const game of this.registeredGames.values()) {
      await db
        .insert(games)
        .values({
          id: game.id,
          name: game.name,
          minPlayers: game.minPlayers,
          maxPlayers: game.maxPlayers,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: games.id,
          set: {
            name: game.name,
            minPlayers: game.minPlayers,
            maxPlayers: game.maxPlayers,
            isActive: true,
          },
        });
    }
  }
}
