import { RoleAndRollActor } from "./documents/actor.mjs";
import { RoleAndRollItem } from "./documents/item.mjs";
import { RoleAndRollActorSheet } from "./sheets/actor-sheet.mjs";
import { RoleAndRollItemSheet } from "./sheets/item-sheet.mjs";
import { patchCombatForRnR } from "./initiative.mjs";
import { SessionAbilitiesConfig } from "./session-abilities-config.mjs";
import {
  registerAllPresets,
  modifierToPresetCode,
  getSystemIdFromCode,
  isDefaultModifier
} from "./dice-presets.mjs";

export const RNR = {};

function safeCapitalize(str) {
  if (!str || typeof str !== "string") return "";

  // Try to localize using translation keys
  const localizedKey = `ROLEANDROLL.Attributes.${str}`;
  let result = game.i18n?.localize(localizedKey);

  // If localization returns the same key (meaning it wasn't found in Attributes),
  // try Abilities
  if (result === localizedKey) {
    const abilityKey = `ROLEANDROLL.Abilities.${str}`;
    result = game.i18n?.localize(abilityKey);

    // If still not found, try AbilityCategories
    if (result === abilityKey) {
      const catKey = `ROLEANDROLL.AbilityCategories.${str}`;
      result = game.i18n?.localize(catKey);

      // If still not found, just capitalize the first letter
      if (result === catKey) {
        result = str.charAt(0).toUpperCase() + str.slice(1);
      }
    }
  }

  return result;
}

Hooks.once("init", function () {
  console.log("Role & Roll | Initializing system (FVTT v13 safe)");
  patchCombatForRnR();

  game.roleandroll = {
    Actor: RoleAndRollActor,
    Item: RoleAndRollItem,
    rollDicePool,
    safeCapitalize
  };

  CONFIG.Actor.documentClass = RoleAndRollActor;
  CONFIG.Item.documentClass = RoleAndRollItem;

  /* ------------ Handlebars Helpers ------------ */

  Handlebars.registerHelper("capitalize", safeCapitalize);
  Handlebars.registerHelper("range", (a, b) => Array.from({ length: b - a + 1 }, (_, i) => i + a));
  Handlebars.registerHelper("lte", (a, b) => a <= b);
  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("or", (...args) => args.slice(0, -1).some(Boolean));
  Handlebars.registerHelper("checked", (v) => (v ? "checked" : ""));
  Handlebars.registerHelper("neq", (a, b) => a !== b);
  Handlebars.registerHelper("and", (a, b) => a && b);
  Handlebars.registerHelper("showEn", (key) => {
    try {
      const main = game.i18n.localize(key);
      const en = game.i18n._fallback?.ROLEANDROLL;

      if (!en) return "";

      const path = key.split(".");
      let enValue = en;
      for (const p of path.slice(1)) enValue = enValue?.[p];

      const currentLang = game.i18n.lang;

      if (currentLang === "en") return "";
      if (!enValue) return "";
      if (main === enValue) return "";

      return `${enValue}`;
    } catch {
      return "";
    }
  });

  // Helper for concatenating strings
  Handlebars.registerHelper("concat", (...args) => {
    args.pop(); // Remove Handlebars options object
    return args.join('');
  });

  // Helper to get English translation specifically
  Handlebars.registerHelper("localizeEn", (key) => {
    const enTranslations = game.i18n._fallback;
    if (!enTranslations) return key;

    const keys = key.split('.');
    let result = enTranslations;
    for (const k of keys) {
      result = result?.[k];
      if (!result) return key;
    }
    return result || key;
  });

  // Helper to add numbers (useful for 1-indexed display)
  Handlebars.registerHelper("add", (a, b) => a + b);
  // Helper to format ability attributes for display  
  Handlebars.registerHelper("formatAbilityAttributes", function (ability) {
    if (!ability || !ability.attributes || !ability.attributes.length) {
      return "";
    }

    const cap = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1, 3) : "";
    const mode = ability.attributeMode || 'single';
    const attrs = ability.attributes;

    if (mode === 'single' && attrs.length > 0) {
      return ` (${cap(attrs[0])})`;
    } else if (mode === 'dual' && attrs.length >= 2) {
      return ` (${cap(attrs[0])}, ${cap(attrs[1])})`;
    } else if (mode === 'select' && attrs.length > 1) {
      return ` (${cap(attrs[0])} / ${cap(attrs[1])})`;
    }
    return "";
  });
  // Session Abilities Handlebars Helpers
  Handlebars.registerHelper("isSessionAbilitiesEnabled", () => {
    return game.settings?.get("role-and-roll", "sessionAbilitiesEnabled") || false;
  });
  Handlebars.registerHelper("getSessionAbilities", () => {
    return game.settings?.get("role-and-roll", "customSessionAbilities") || {};
  });
  Handlebars.registerHelper("getSessionAbilityDice", function(key) {
    return this.sessionAbilitiesData?.[key]?.dice || 0;
  });

  Handlebars.registerHelper("getSessionAbilitySucceed", function(key) {
    return this.sessionAbilitiesData?.[key]?.succeed || false;
  });
  /* ------------ Settings ------------ */
  // Register Session Abilities settings
  game.settings.register("role-and-roll", "sessionAbilitiesEnabled", {
    name: "ROLEANDROLL.Settings.EnableSessionAbilities",
    hint: "ROLEANDROLL.Settings.EnableSessionAbilitiesHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: () => {
      // Re-render all actor sheets when setting changes
      Object.values(ui.windows).forEach(app => {
        if (app.constructor.name === "RoleAndRollActorSheet") app.render();
      });
    }
  });
  game.settings.register("role-and-roll", "customSessionAbilities", {
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });
  game.settings.registerMenu("role-and-roll", "sessionAbilitiesConfig", {
    name: "ROLEANDROLL.Settings.ConfigureSessionAbilities",
    label: "ROLEANDROLL.Settings.ConfigureSessionAbilitiesLabel",
    hint: "ROLEANDROLL.Settings.ConfigureSessionAbilitiesHint",
    icon: "fas fa-cogs",
    type: SessionAbilitiesConfig,
    restricted: true
  });
  /* ------------ Sheets ------------ */

  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("role-and-roll", RoleAndRollActorSheet, {
    makeDefault: true,
    types: ["character", "npc"],
    label: "Role & Roll Actor Sheet"
  });

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("role-and-roll", RoleAndRollItemSheet, {
    makeDefault: true,
    types: ["ability", "equipment", "skill"],
    label: "Role & Roll Item Sheet"
  });
});

/* ------------ Dice So Nice Integration ------------ */

Hooks.once("diceSoNiceReady", (dice3d) => {
  console.log("Role & Roll | Registering custom dice with Dice So Nice");

  // Register ALL possible dice face combinations (81 presets)
  // This allows us to reliably show any combination of +/- modifiers on faces 2-5
  // Each preset has a unique code like "bbbb" (all blank), "mpbb" (minus-plus-blank-blank), etc.
  const count = registerAllPresets(dice3d);

  console.log(`Role & Roll | Successfully registered ${count} dice presets`);
});

/* ------------ Dice Pool System ------------ */

export async function rollDicePool(numDice, label = "Dice Pool", autoSuccess = 0, actor = null, willPower = 0, modifiers = []) {
  numDice = Number(numDice) || 0;
  autoSuccess = Number(autoSuccess) || 0;
  willPower = Number(willPower) || 0;

  // Allow 0 dice ONLY if there is Will Power or Auto Success to count
  if (numDice <= 0 && willPower <= 0 && autoSuccess <= 0) {
    ui.notifications?.warn(game.i18n.localize("ROLEANDROLL.Notifications.CannotRoll0Dice") || "Cannot roll 0 dice!");
    return null;
  }

  // Get actor info
  let actorImg = null;
  let actorName = "Unknown";

  if (actor?.img) actorImg = actor.img;
  if (actor?.name) actorName = actor.name;

  if (!actorImg || actorName === "Unknown") {
    const speaker = ChatMessage.getSpeaker();
    const speakerActor = game.actors?.get(speaker.actor);
    if (speakerActor) {
      if (!actorImg) actorImg = speakerActor.img;
      if (actorName === "Unknown") actorName = speakerActor.name;
    }
  }

  const show3D = game.dice3d && typeof game.dice3d.showForRoll === "function";

  // Prepare dice with modifiers
  const dice = [];
  for (let i = 0; i < numDice; i++) {
    const modifier = modifiers[i] || { positions: { 2: 'blank', 3: 'blank', 4: 'blank', 5: 'blank' } };
    dice.push({ modifier, rerollWith: modifier });
  }

  // Roll all dice with reroll loop
  const allRolls = [];
  let rerollQueue = [...dice];

  while (rerollQueue.length > 0) {
    const currentRolls = [];
    const customRolls = [];

    for (const die of rerollQueue) {
      // Create the roll
      const roll = new Roll("1d6");
      await roll.evaluate();
      const value = roll.total;

      console.log(`Rolled: ${value}, Modifier positions:`, die.modifier.positions);

      // Check if this die has modifiers (check if any position 2-5 is not blank)
      const hasModifiers = !(
        (!die.modifier.positions[2] || die.modifier.positions[2] === 'blank') &&
        (!die.modifier.positions[3] || die.modifier.positions[3] === 'blank') &&
        (!die.modifier.positions[4] || die.modifier.positions[4] === 'blank') &&
        (!die.modifier.positions[5] || die.modifier.positions[5] === 'blank')
      );

      console.log(`Die has modifiers: ${hasModifiers}`);

      // Store for 3D display
      customRolls.push({
        roll,
        modifierPositions: die.modifier.positions,
        hasModifiers
      });

      // Determine face based on value and modifier
      let face = 'blank';
      let modifier = null;

      if (value === 1) {
        face = 'dot';
      } else if (value === 6) {
        face = 'R';
      } else if (value >= 2 && value <= 5) {
        const modValue = die.modifier.positions[value];
        if (modValue === 'plus') {
          face = 'plus';
          modifier = '+';
        } else if (modValue === 'minus') {
          face = 'minus';
          modifier = '-';
        }
      }

      currentRolls.push({
        value,
        face,
        modifier,
        rerollModifier: die.rerollWith,
        annotation: null
      });
    }

    // Show 3D dice one by one
    if (show3D && customRolls.length > 0) {
      const animations = [];
      for (let i = 0; i < customRolls.length; i++) {
        const { roll, modifierPositions, hasModifiers } = customRolls[i];

        if (!hasModifiers) {
          // Use default system for unmodified dice
          console.log("Role & Roll | Showing default die (no modifiers)");

          if (roll.terms && roll.terms[0]) {
            if (!roll.terms[0].options) roll.terms[0].options = {};
            roll.terms[0].options.appearance = {
              system: "role-and-roll-default"
            };
          }
        } else {
          // Use custom preset for modified dice
          const presetCode = modifierToPresetCode(modifierPositions);
          const systemId = getSystemIdFromCode(presetCode);

          console.log(`Role & Roll | Showing die with modifiers: ${presetCode} -> ${systemId}`);

          if (roll.terms && roll.terms[0]) {
            if (!roll.terms[0].options) roll.terms[0].options = {};
            roll.terms[0].options.appearance = {
              system: systemId
            };
          }
        }

        // Show the dice
        try {
          const p = game.dice3d.showForRoll(roll, game.user, true, null, false);
          animations.push(p);
          // Small delay for sequential effect
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (e) {
          console.error("Role & Roll | Error showing dice:", e);
        }
      }
      // Wait for all animations in this batch to finish
      await Promise.all(animations);
    }

    // Add to all rolls
    allRolls.push(...currentRolls);

    // Resolve modifiers
    resolveModifiers(currentRolls, allRolls);

    // Check for rerolls
    rerollQueue = [];
    for (const dieResult of currentRolls) {
      if (dieResult.removed) continue;

      if (dieResult.face === 'R') {
        rerollQueue.push({
          modifier: dieResult.rerollModifier,
          rerollWith: dieResult.rerollModifier
        });
      }
      if (dieResult.face === 'plus' && dieResult.copiedFace === 'R') {
        rerollQueue.push({
          modifier: dieResult.rerollModifier,
          rerollWith: dieResult.rerollModifier
        });
      }
    }
  }

  // Count successes and criticals
  let successes = autoSuccess + willPower;
  let criticals = 0;

  for (const die of allRolls) {
    if (die.removed) continue;

    if (die.face === 'dot') successes++;
    if (die.face === 'R') {
      successes++;
      criticals++;
    }
    if (die.face === 'plus' && die.copiedFace) {
      if (die.copiedFace === 'dot') successes++;
      if (die.copiedFace === 'R') {
        successes++;
        criticals++;
      }
    }
  }

  // Generate dice HTML
  const diceHTML = allRolls.map(die => {
    let symbol = '';
    let cssClass = '';
    let annotationHTML = '';

    if (die.face === 'dot') {
      symbol = '●';
      cssClass = 'success';
    } else if (die.face === 'R') {
      symbol = 'R';
      cssClass = 'critical';
    } else if (die.face === 'plus') {
      symbol = '+';
      cssClass = 'modifier-plus';
      if (die.cancelled) cssClass += ' cancelled';
      if (die.annotation) annotationHTML = `<div class="die-annotation">${die.annotation}</div>`;
    } else if (die.face === 'minus') {
      symbol = '-';
      cssClass = 'modifier-minus';
      if (die.cancelled) cssClass += ' cancelled';
      if (die.annotation) annotationHTML = `<div class="die-annotation">${die.annotation}</div>`;
    } else if (die.face === 'blank') {
      symbol = '';
      cssClass = 'blank';
      if (die.annotation) annotationHTML = `<div class="die-annotation">${die.annotation}</div>`;
    }

    if (die.removed) {
      cssClass += ' removed';
      if (die.annotation) annotationHTML = `<div class="die-annotation">${die.annotation}</div>`;
    }

    return `
      <div class="die-container">
        ${annotationHTML}
        <div class="die-box ${cssClass}">${symbol}</div>
      </div>
    `;
  }).join('');

  // Add success indicators
  let successIndicators = '';
  if (autoSuccess > 0 || willPower > 0) {
    const parts = [];
    if (autoSuccess > 0) {
      parts.push(`+${autoSuccess} ${game.i18n.localize("ROLEANDROLL.Labels.Succeed") || "Succeed"}`);
    }
    if (willPower > 0) {
      parts.push(`-${willPower} Will Power`);
    }
    successIndicators = `<div class="success-bonus-indicator">${parts.join(' | ')}</div>`;
  }

  const flavor = `
    <div class="role-roll-result">
      <div class="roll-header">
        ${actorImg ? `<img src="${actorImg}" class="roll-avatar-img" />` : ""}
        <div class="roll-actor-name">${actorName}</div>
      </div>

      <div class="roll-label"><strong>${label}</strong></div>

      <div class="dice-results">
        <div class="rolled-label">${game.i18n.localize("ROLEANDROLL.Rolls.Rolled") || "Rolled"}:</div>
        <div class="dice-pool-display">${diceHTML}</div>
        ${successIndicators}
      </div>

      <div class="roll-totals">
        <span class="success-count">${game.i18n.localize("ROLEANDROLL.Rolls.Successes") || "Successes"}: ${successes}</span> | 
        <span class="critical-count">${game.i18n.localize("ROLEANDROLL.Rolls.Criticals") || "Criticals"}: ${criticals}</span>
      </div>
    </div>
  `;

  const messageData = {
    user: game.user.id,
    speaker: ChatMessage.getSpeaker(),
    content: flavor,
    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    sound: CONFIG.sounds.dice
  };

  await ChatMessage.create(messageData);

  // Deduct will power
  if (willPower > 0 && actor) {
    const currentWP = actor.system.wp.value || 0;
    await actor.update({ 'system.wp.value': Math.max(0, currentWP - willPower) });
  }

  return { successes, criticals, results: allRolls };
}

// Helper function to resolve +/- modifiers
function resolveModifiers(diceResults, allRolls = null) {
  // Step 1: Count +/- faces
  const plusIndices = [];
  const minusIndices = [];

  diceResults.forEach((die, idx) => {
    if (die.face === 'plus') plusIndices.push(idx);
    if (die.face === 'minus') minusIndices.push(idx);
  });

  // Step 2: Cancel +/- pairs
  const cancelCount = Math.min(plusIndices.length, minusIndices.length);
  for (let i = 0; i < cancelCount; i++) {
    const plusIdx = plusIndices[i];
    const minusIdx = minusIndices[i];
    // Keep the face type but mark as cancelled
    diceResults[plusIdx].cancelled = true;
    diceResults[plusIdx].annotation = 'cancelled';
    diceResults[minusIdx].cancelled = true;
    diceResults[minusIdx].annotation = 'cancelled';
  }

  // Step 3: Process remaining - faces (remove best faces)
  // - can remove from ALL rounds (current + previous), priority: + > R(with +) > R > R(with -) > dot
  const remainingMinus = minusIndices.slice(cancelCount);
  for (const minusIdx of remainingMinus) {
    // Find best face to remove (priority: + > R(with +) > R > R(with -) > dot)
    // Look in allRolls if provided, otherwise just current round
    const searchArray = allRolls || diceResults;
    let bestIdx = -1;
    let bestPriority = -1;
    let bestInAllRolls = false; // Track if best is from allRolls

    // First check current round (diceResults)
    diceResults.forEach((die, idx) => {
      if (idx === minusIdx) return; // Don't target self
      if (die.face === 'blank') return; // Skip already blanks
      if (die.face === 'minus') return; // Skip other minus
      if (die.removed) return; // Skip already removed

      let priority = 0;
      if (die.face === 'plus') priority = 100;
      else if (die.face === 'R' && die.modifier === '+') priority = 90;
      else if (die.face === 'R' && !die.modifier) priority = 80;
      else if (die.face === 'R' && die.modifier === '-') priority = 70;
      else if (die.face === 'dot') priority = 60;

      if (priority > bestPriority) {
        bestPriority = priority;
        bestIdx = idx;
        bestInAllRolls = false;
      }
    });

    // Then check all previous rounds (allRolls) if provided
    if (allRolls && allRolls.length > diceResults.length) {
      allRolls.forEach((die, idx) => {
        // Skip current round dice (already checked above)
        if (idx < allRolls.length - diceResults.length) {
          if (die.face === 'blank') return; // Skip already blanks
          if (die.face === 'minus') return; // Skip other minus
          if (die.removed) return; // Skip already removed

          let priority = 0;
          if (die.face === 'plus') priority = 100;
          else if (die.face === 'R' && die.modifier === '+') priority = 90;
          else if (die.face === 'R' && !die.modifier) priority = 80;
          else if (die.face === 'R' && die.modifier === '-') priority = 70;
          else if (die.face === 'dot') priority = 60;

          if (priority > bestPriority) {
            bestPriority = priority;
            bestIdx = idx;
            bestInAllRolls = true;
            bestInAllRolls = true;
          }
        }
      });
    }

    if (bestIdx >= 0) {
      const targetDie = bestInAllRolls ? allRolls[bestIdx] : diceResults[bestIdx];
      const targetFace = targetDie.face;
      // Mark as removed instead of making blank
      targetDie.removed = true;
      targetDie.annotation = `removed`;
      // Keep minus face as 'minus' but add annotation
      diceResults[minusIdx].annotation = `${targetFace} `;
    } else {
      // No target found, just mark annotation
      diceResults[minusIdx].annotation = 'no target';
    }
  }

  // Step 4: Process remaining + faces (copy best faces)
  // + can copy from ALL rounds (current + previous), priority: R > dot > blank
  const remainingPlus = plusIndices.slice(cancelCount);
  for (const plusIdx of remainingPlus) {
    // Find best face to copy (priority: R > dot > blank)
    // Look in allRolls if provided, otherwise just current round
    const searchArray = allRolls || diceResults;
    let bestIdx = -1;
    let bestPriority = -1;
    let bestInAllRolls = false; // Track if best is from allRolls

    // First check current round (diceResults)
    diceResults.forEach((die, idx) => {
      if (idx === plusIdx) return; // Don't copy self
      if (die.face === 'plus') return; // Don't copy other plus
      if (die.removed) return; // Skip removed faces

      let priority = 0;
      if (die.face === 'R') priority = 100;
      else if (die.face === 'dot') priority = 50;
      else if (die.face === 'blank') priority = 10;

      if (priority > bestPriority) {
        bestPriority = priority;
        bestIdx = idx;
        bestInAllRolls = false;
      }
    });

    // Then check all previous rounds (allRolls) if provided
    if (allRolls && allRolls.length > diceResults.length) {
      allRolls.forEach((die, idx) => {
        // Skip current round dice (already checked above)
        if (idx < allRolls.length - diceResults.length) {
          if (die.face === 'plus') return; // Don't copy other plus
          if (die.removed) return; // Skip removed faces

          let priority = 0;
          if (die.face === 'R') priority = 100;
          else if (die.face === 'dot') priority = 50;
          else if (die.face === 'blank') priority = 10;

          if (priority > bestPriority) {
            bestPriority = priority;
            bestIdx = idx;
            bestInAllRolls = true;
          }
        }
      });
    }

    if (bestIdx >= 0) {
      const sourceDie = bestInAllRolls ? allRolls[bestIdx] : diceResults[bestIdx];
      const sourceFace = sourceDie.face;
      // Keep face as 'plus' but track what it copied
      diceResults[plusIdx].copiedFace = sourceFace;
      diceResults[plusIdx].annotation = `${sourceFace} `;
    } else {
      // No source found, copies blank
      diceResults[plusIdx].copiedFace = 'blank';
      diceResults[plusIdx].annotation = ' ';
    }
  }
}

/* ------------ Ready ------------ */
Hooks.on("preCreateActor", (doc) => {
  doc.updateSource({
    prototypeToken: {
      actorLink: true,
      bar1: { attribute: "health" },
      bar2: { attribute: "mental" },
      sight: {
        enabled: true,
        range: 60,
        angle: 360,
        visionMode: "basic",
        color: null,
        attenuation: 0.1,
        brightness: 0,
        saturation: 0,
        contrast: 0
      }
    }
  });
});

Hooks.once("ready", function () {
  console.log("Role & Roll | System Ready (v13)");
  //patchCombatForRnR();
});