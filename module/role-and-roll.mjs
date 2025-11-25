// module/role-and-roll.mjs

import { RoleAndRollActor } from "./documents/actor.mjs";
import { RoleAndRollItem } from "./documents/item.mjs";
import { RoleAndRollActorSheet } from "./sheets/actor-sheet.mjs";
import { RoleAndRollItemSheet } from "./sheets/item-sheet.mjs";

Hooks.once('init', async function() {
  console.log('Role & Roll | Initializing Role & Roll Game System');

  game.roleandroll = {
    RoleAndRollActor,
    RoleAndRollItem,
    rollDicePool
  };

  CONFIG.Actor.documentClass = RoleAndRollActor;
  CONFIG.Item.documentClass = RoleAndRollItem;

  // Register Handlebars helpers
  Handlebars.registerHelper('capitalize', function(str) {
    if (typeof str !== 'string') return '';
    let value = str.charAt(0).toUpperCase() + str.slice(1);
    return value.replace("GeneralEducation", "General education").replace("FirstAid", "First aid").replace("law", "Law").replace("electronic", "Electronic").replace("mechanical", "Mechanical").replace("craft", "craft").replace("occult", "Occult").replace("perception", "Perception").replace("HideSneak", "Hide & Sneek").replace("persuade", "Persuade").replace("consider", "Consider").replace("empathy", "Empathy").replace("bet", "Bet").replace("SenseOfLie", "Sense of lie").replace("intimidate", "Intimidate").replace("survival", "Survival").replace("climb", "Climb").replace("stealth", "Stealth").replace("break", "Brawl").replace("weapons", "Weapons").replace("SwordPlay", "Sword play").replace("throwing", "Throwing").replace("ShootingWeapons", "Shooting weapons").replace("reflex", "Reflex").replace("agility", "Agility").replace("athlete", "Athlete")
  });

  Handlebars.registerHelper('range', function(start, end) {
    const range = [];
    for (let i = start; i <= end; i++) {
      range.push(i);
    }
    return range;
  });

  Handlebars.registerHelper('lte', function(a, b) {
    return a <= b;
  });

  Handlebars.registerHelper('eq', function(a, b) {
    return a === b;
  });

  Handlebars.registerHelper('or', function() {
    return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
  });

  Handlebars.registerHelper('checked', function(value) {
    return value ? 'checked' : '';
  });

  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("role-and-roll", RoleAndRollActorSheet, {
    makeDefault: true,
    label: "ROLEANDROLL.SheetLabels.Actor"
  });

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("role-and-roll", RoleAndRollItemSheet, {
    makeDefault: true,
    label: "ROLEANDROLL.SheetLabels.Item"
  });
});

// Dice rolling function with sequential dice for Dice So Nice
export async function rollDicePool(numDice, label = "Dice Pool") {
  if (numDice <= 0) {
    ui.notifications.warn("Cannot roll 0 or negative dice!");
    return null;
  }

  let successes = 0;
  let criticals = 0;
  const results = [];
  const allRolls = [];

  // Roll initial dice
  for (let i = 0; i < numDice; i++) {
    const roll = new Roll("1d6");
    await roll.evaluate();
    allRolls.push(roll);
    
    const result = roll.total;
    results.push(result);

    if (result === 1) {
      successes++;
    } else if (result === 6) {
      criticals++;
      successes++;
    }

    // Show each roll individually with Dice So Nice if available
    if (game.dice3d) {
      await game.dice3d.showForRoll(roll, game.user, true);
    }
  }

  // Handle critical bonus dice (6s trigger extra rolls)
  let bonusDiceToRoll = criticals;
  while (bonusDiceToRoll > 0) {
    const bonusRoll = new Roll("1d6");
    await bonusRoll.evaluate();
    allRolls.push(bonusRoll);
    
    const bonusResult = bonusRoll.total;
    results.push(bonusResult);
    
    if (bonusResult === 1) {
      successes++;
    } else if (bonusResult === 6) {
      criticals++;
      successes++;
      bonusDiceToRoll++; // Another 6! Roll another bonus die
    }
    
    bonusDiceToRoll--;

    // Show bonus roll with Dice So Nice
    if (game.dice3d) {
      await game.dice3d.showForRoll(bonusRoll, game.user, true);
    }
  }

  // Create a combined roll for chat display
  const totalDice = results.length;
  const diceResults = results.map(r => ({result: r, active: true}));
  
  // Prepare chat message
  const chatData = {
    user: game.user.id,
    speaker: ChatMessage.getSpeaker(),
    flavor: `<h3>${label.replace("generalEducation", "General education").replace("search", "Search").replace("history", "History").replace("art", "Art").replace("medicine", "Medicine").replace("herb", "Herb").replace("firstAid", "First aid").replace("law", "Law").replace("electronic", "Electronic").replace("mechanical", "Mechanical").replace("craft", "craft").replace("occult", "Occult").replace("perception", "Perception").replace("hideSneak", "Hide & Sneek").replace("persuade", "Persuade").replace("consider", "Consider").replace("empathy", "Empathy").replace("bet", "Bet").replace("senseOfLie", "Sense of lie").replace("intimidate", "Intimidate").replace("survival", "Survival").replace("climb", "Climb").replace("stealth", "Stealth").replace("break", "Brawl").replace("weapons", "Weapons").replace("swordPlay", "Sword play").replace("throwing", "Throwing").replace("shootingWeapons", "Shooting weapons").replace("reflex", "Reflex").replace("agility", "Agility").replace("athlete", "Athlete")}</h3>`,
    content: `
      <div class="role-roll-result">
        <div class="dice-results">
          <strong>Rolled ${totalDice} dice:</strong> ${results.join(", ").replaceAll("1", "•").replaceAll("6","R").replaceAll("2","0").replaceAll("3","0").replaceAll("4","0").replaceAll("5","0")}
        </div>
        <div class="success-count">
          <strong>Successes:</strong> ${successes}
          ${criticals > 0 ? `<br><strong>Criticals (R):</strong> ${criticals}` : ''}
        </div>
      </div>
    `,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER
  };

  await ChatMessage.create(chatData);

  return {
    successes,
    criticals,
    results,
    totalDice: results.length,
    rolls: allRolls
  };
}

Hooks.once("ready", async function() {
  console.log("Role & Roll | System Ready");
});