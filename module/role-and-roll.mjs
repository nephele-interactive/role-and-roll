import { RoleAndRollActor } from "./documents/actor.mjs";
import { RoleAndRollItem } from "./documents/item.mjs";
import { RoleAndRollActorSheet } from "./sheets/actor-sheet.mjs";
import { RoleAndRollItemSheet } from "./sheets/item-sheet.mjs";
import { patchCombatForRnR } from "./initiative.mjs";

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

/* ------------ Dice Pool System ------------ */

export async function rollDicePool(numDice, label = "Dice Pool", autoSuccess = 0, actor = null) {
  numDice = Number(numDice) || 0;
  autoSuccess = Number(autoSuccess) || 0;

  if (numDice <= 0) {
    ui.notifications?.warn("Cannot roll 0 dice!");
    return null;
  }

  let successes = autoSuccess; // Start with automatic successes
  let criticals = 0;
  let queue = numDice;
  const results = [];
  const rolls = [];
  let actorImg = null;

  if (actor?.img) {
    actorImg = actor.img;
  } else {
    const speaker = ChatMessage.getSpeaker();
    const speakerActor = game.actors?.get(speaker.actor);
    if (speakerActor?.img) {
      actorImg = speakerActor.img;
    }
  }

  let actorName = "Unknown";

  if (actor?.name) {
    actorName = actor.name;
  } else {
    const speaker = ChatMessage.getSpeaker();
    const speakerActor = game.actors?.get(speaker.actor);
    if (speakerActor?.name) {
      actorName = speakerActor.name;
    }
  }


  const show3D = game.dice3d && typeof game.dice3d.showForRoll === "function";

  // Roll dice one by one
  while (queue > 0) {
    const roll = await new Roll("1d6").evaluate({ async: true });
    const r = roll.total;

    // Show each die one by one in Dice So Nice
    if (show3D) {
      await game.dice3d.showForRoll(roll, game.user, true);
    }

    rolls.push(roll);
    results.push(r);

    queue--; // Decrement first

    if (r === 1) successes++;
    if (r === 6) {
      successes++;
      criticals++;
      queue++; // Roll again on a 6 (exploding dice)
    }
  }

  // Display results in chat with dice boxes showing ● for 1, R for 6, blank for others
  const diceHTML = results.map(r => {
    let symbol = '';
    let cssClass = '';

    if (r === 1) {
      symbol = '●';
      cssClass = 'success';
    } else if (r === 6) {
      symbol = 'R';
      cssClass = 'critical';
    }

    return `<div class="die-box ${cssClass}">${symbol}</div>`;
  }).join('');

  // Add automatic success indicator if present
  const autoSuccessHTML = autoSuccess > 0
    ? `<div class="auto-success-indicator">+${autoSuccess} ${game.i18n.localize("ROLEANDROLL.Labels.Succeed")}</div>`
    : '';

  const flavor = `
  <div class="role-roll-result">

    <div class="roll-header">
      ${actorImg ? `<img src="${actorImg}" class="roll-avatar-img" />` : ""}
      <div class="roll-actor-name">${actorName}</div>
    </div>

    <div class="roll-label"><strong>${label}</strong></div>

    <div class="dice-results">
      <div class="rolled-label">${game.i18n.localize("ROLEANDROLL.Rolls.Rolled")}:</div>
      <div class="dice-pool-display">${diceHTML}</div>
      ${autoSuccessHTML}
    </div>

    <div class="roll-totals">
      <span class="success-count">${game.i18n.localize("ROLEANDROLL.Rolls.Successes")}: ${successes}</span> | 
      <span class="critical-count">${game.i18n.localize("ROLEANDROLL.Rolls.Criticals")}: ${criticals}</span>
    </div>

  </div>
`;


  // Create a simple roll for the chat without showing dice (already shown individually)
  const messageData = {
    user: game.user.id,
    speaker: ChatMessage.getSpeaker(),
    content: flavor,
    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    sound: CONFIG.sounds.dice
  };

  await ChatMessage.create(messageData);
  return { successes, criticals, results };
}

/* ------------ Ready ------------ */
Hooks.on("preCreateActor", (doc) => {
  doc.updateSource({
    prototypeToken: {
      actorLink: true,
      bar1: { attribute: "health" },
      bar2: { attribute: "mental" }
    }
  });
});

/* ------------ Dice So Nice Configuration ------------ */
Hooks.once("diceSoNiceReady", (dice3d) => {
  console.log("Role & Roll | Configuring Dice So Nice");

  // Register the system first
  dice3d.addSystem({ id: "role-and-roll", name: "Role & Roll" }, "preferred");

  // Add custom d6 appearance with custom labels
  dice3d.addDicePreset({
    type: "d6",
    labels: ["●", " ", " ", " ", " ", "R"],
    system: "role-and-roll"
  });

  console.log("Role & Roll | Custom 3D dice labels registered");
});

Hooks.once("ready", function () {
  console.log("Role & Roll | System Ready (v13)");
  patchCombatForRnR();
});
