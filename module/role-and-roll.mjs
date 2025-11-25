// module/role-and-roll.mjs

import { RoleAndRollActor } from "./documents/actor.mjs";
import { RoleAndRollItem } from "./documents/item.mjs";
import { RoleAndRollActorSheet } from "./sheets/actor-sheet.mjs";
import { RoleAndRollItemSheet } from "./sheets/item-sheet.mjs";

// Namespace
export const RNR = {};

Hooks.once("init", function () {
  console.log("Role & Roll | Initializing system (FVTT v13 safe)");

  // Expose on global game object
  game.roleandroll = {
    Actor: RoleAndRollActor,
    Item: RoleAndRollItem,
    rollDicePool
  };

  CONFIG.Actor.documentClass = RoleAndRollActor;
  CONFIG.Item.documentClass = RoleAndRollItem;

  // --------------------
  // Handlebars Helpers
  // --------------------
  const safeCapitalize = (str) => {
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
      athlete: "Athlete"
    };

    return map[str] || (str.charAt(0).toUpperCase() + str.slice(1));
  };

  Handlebars.registerHelper("capitalize", safeCapitalize);

  Handlebars.registerHelper("range", (start, end) => {
    const r = [];
    for (let i = start; i <= end; i++) r.push(i);
    return r;
  });

  Handlebars.registerHelper("lte", (a, b) => a <= b);
  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("or", (...args) => args.slice(0, -1).some(Boolean));
  Handlebars.registerHelper("checked", (value) => (value ? "checked" : ""));

  // --------------------
  // Register Sheets
  // --------------------
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

// --------------------
// Dice System (v13 Safe + Dice So Nice Safe)
// --------------------
export async function rollDicePool(numDice, label = "Dice Pool") {
  numDice = Number(numDice) || 0;
  if (numDice <= 0) {
    ui.notifications?.warn("Cannot roll 0 dice!");
    return null;
  }

  let successes = 0;
  let criticals = 0;
  const results = [];
  const rolls = [];

  const show3D = game.dice3d && typeof game.dice3d.showForRoll === "function";

  // Initial rolls
  for (let i = 0; i < numDice; i++) {
    const roll = await new Roll("1d6").evaluate({ async: true });
    rolls.push(roll);

    const result = roll.total;
    results.push(result);

    if (result === 1 || result === 6) successes++;
    if (result === 6) criticals++;

    if (show3D) await game.dice3d.showForRoll(roll, game.user, true);
  }

  // Exploding 6s
  let extra = criticals;
  while (extra > 0) {
    const roll = await new Roll("1d6").evaluate({ async: true });
    rolls.push(roll);

    const r = roll.total;
    results.push(r);

    if (r === 1 || r === 6) successes++;
    if (r === 6) extra++;

    extra--;

    if (show3D) await game.dice3d.showForRoll(roll, game.user, true);
  }
      
  const safeLabel = Handlebars.helpers.capitalize(label).replaceAll("strength", "Strength").replaceAll("dexterity", "Dexterity").replaceAll("toughness", "Toughness").replaceAll("intellect", "Intellect").replaceAll("aptitude", "Aptitude").replaceAll("sanity", "Sanity").replaceAll("charm", "Charm").replaceAll("rhetoric", "Rhetoric").replaceAll("ego", "Ego").replaceAll("generalEducation", "General education").replaceAll("search", "Search").replaceAll("history", "History").replaceAll("art", "Art").replaceAll("medicine", "Medicine").replaceAll("herb", "Herb").replaceAll("firstAid", "First aid").replaceAll("law", "Law").replaceAll("electronic", "Electronic").replaceAll("mechanical", "Mechanical").replaceAll("craft", "craft").replaceAll("occult", "Occult").replaceAll("perception", "Perception").replaceAll("hideSneak", "Hide & Sneek").replaceAll("persuade", "Persuade").replaceAll("consider", "Consider").replaceAll("empathy", "Empathy").replaceAll("bet", "Bet").replaceAll("senseOfLie", "Sense of lie").replaceAll("intimidate", "Intimidate").replaceAll("survival", "Survival").replaceAll("climb", "Climb").replaceAll("stealth", "Stealth").replaceAll("break", "Brawl").replaceAll("weapons", "Weapons").replaceAll("swordPlay", "Sword play").replaceAll("throwing", "Throwing").replaceAll("shootingWeapons", "Shooting weapons").replaceAll("reflex", "Reflex").replaceAll("agility", "Agility").replaceAll("athlete", "Athlete");

  // Chat output
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker(),
    flavor: `<h3>${safeLabel}</h3>`,
    content: `
      <div class="role-roll-result">
        <div class="dice-results">
          <strong>Rolled ${results.length} dice:</strong>
          ${results
        .map(r => (r === 1 ? "•" : r === 6 ? "R" : "0"))
        .join(" ")}
        </div>
        <div class="success-count">
          <strong>Successes:</strong> ${successes}
          ${criticals ? `<br><strong>Criticals (R):</strong> ${criticals}` : ""}
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

Hooks.once("ready", function () {
  console.log("Role & Roll | System Ready (v13)");
});
