import { RoleAndRollActor } from "./documents/actor.mjs";
import { RoleAndRollItem } from "./documents/item.mjs";
import { RoleAndRollActorSheet } from "./sheets/actor-sheet.mjs";
import { RoleAndRollItemSheet } from "./sheets/item-sheet.mjs";
import { patchCombatForRnR } from "./initiative.mjs";

export const RNR = {};

function safeCapitalize(str) {
  if (!str || typeof str !== "string") return "";

  const map = {
    strength: "Strength",
    dexterity: "Dexterity",
    toughness: "Toughness",
    intellect: "Intellect",
    aptitude: "Aptitude",
    sanity: "Sanity",
    charm: "Charm",
    rhetoric: "Rhetoric",
    ego: "Ego",
    generalEducation: "General education",
    search: "Search",
    history: "History",
    art: "Art",
    medicine: "Medicine",
    herb: "Herb",
    firstAid: "First aid",
    law: "Law",
    electronic: "Electronic",
    mechanical: "Mechanical",
    craft: "Craft",
    occult: "Occult",
    perception: "Perception",
    hideSneak: "Hide & Sneak",
    persuade: "Persuade",
    consider: "Consider",
    empathy: "Empathy",
    bet: "Bet",
    senseOfLie: "Sense of lie",
    intimidate: "Intimidate",
    survival: "Survival",
    climb: "Climb",
    stealth: "Stealth",
    break: "Brawl",
    weapons: "Weapons",
    swordPlay: "Sword play",
    throwing: "Throwing",
    shootingWeapons: "Shooting weapons",
    reflex: "Reflex",
    agility: "Agility",
    athlete: "Athlete",
    academic: "Academic",
    intuition: "Intuition and Training",
    physical: "Physical Skills"
  };

  return map[str] || str.charAt(0).toUpperCase() + str.slice(1);
}

Hooks.once("init", function () {
  console.log("Role & Roll | Initializing system (FVTT v13 safe)");

  game.roleandroll = {
    Actor: RoleAndRollActor,
    Item: RoleAndRollItem,
    rollDicePool
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

export async function rollDicePool(numDice, label = "Dice Pool") {
  numDice = Number(numDice) || 0;

  if (numDice <= 0) {
    ui.notifications?.warn("Cannot roll 0 dice!");
    return null;
  }

  let successes = 0;
  let criticals = 0;
  let queue = numDice;
  const results = [];
  const rolls = [];

  const show3D = game.dice3d && typeof game.dice3d.showForRoll === "function";

  while (queue > 0) {
    const roll = await new Roll("1d6").evaluate({ async: true });
    const r = roll.total;

    rolls.push(roll);
    results.push(r);

    if (r === 1) successes++;
    if (r === 6) {
      successes++;
      criticals++;
      queue++;
    }

    if (show3D) await game.dice3d.showForRoll(roll, game.user, true);

    queue--;
  }

  const prettyLabel = safeCapitalize(label);

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker(),
    flavor: `<h3>${prettyLabel}</h3>`,
    content: `
      <div class="role-roll-result">
        <div class="dice-results">
          <b>Rolled:</b> ${results.map(r => (r === 1 ? "●" : r === 6 ? "R" : r)).join(" ")}
        </div>
        <div class="success-count">
          <b>Successes:</b> ${successes}<br>
          <b>Criticals:</b> ${criticals}
        </div>
      </div>
    `,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER
  });

  return {
    successes,
    criticals,
    results,
    totalDice: results.length,
    rolls
  };
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


Hooks.once("ready", function () {
  console.log("Role & Roll | System Ready (v13)");
  patchCombatForRnR(); 
});
