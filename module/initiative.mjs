// module/initiative.mjs
export function patchCombatForRnR() {
  console.log("Role & Roll | Patching initiative (v13) …");

  // Get the actual document class that Foundry uses
  const CombatDoc = CONFIG.Combat?.documentClass || Combat;

  // Hard override: when Foundry calls Combat.rollInitiative(ids, options),
  // we compute R&R-style initiative (success count) and set it.
  const original = CombatDoc.prototype.rollInitiative;

  CombatDoc.prototype.rollInitiative = async function (ids = [], options = {}) {
    console.log("Role & Roll | Custom Combat.rollInitiative()");

    // If no ids provided, mirror the core behavior: choose unrolled & owned combatants.
    if (!ids?.length) {
      ids = this.combatants.reduce((acc, c) => {
        if (c.isOwner && (c.initiative === null || c.initiative === undefined)) acc.push(c.id);
        return acc;
      }, []);
    }

    const updates = [];

    for (const id of ids) {
      const c = this.combatants.get(id);
      if (!c?.isOwner || !c.actor) continue;

      // Read DEX dice from your actor schema
      const dexDice = Number(c.actor.system?.attributes?.dexterity?.dice ?? 0);
      const pool = Math.max(1, dexDice); // at least 1 die

      // Use your system roller: 1 = success, 6 = success + reroll
      const result = await game.roleandroll.rollDicePool(pool, `${c.name} - Initiative`);
      const score = Number(result?.successes ?? 0) + (dexDice*0.01);

      updates.push({ _id: c.id, initiative: score });
    }

    if (updates.length) {
      await this.updateEmbeddedDocuments("Combatant", updates);
      await this.setupTurns();
    }

    // Return this Combat instance to align with core
    return this;
  };
}
