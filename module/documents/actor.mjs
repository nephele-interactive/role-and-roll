// module/documents/actor.mjs

export class RoleAndRollActor extends Actor {
  
  prepareData() {
    super.prepareData();
  }

  prepareBaseData() {
    // Data preparation specific to the actor type
  }

  prepareDerivedData() {
    const actorData = this;
    const systemData = actorData.system;
    const flags = actorData.flags.roleandroll || {};

    // Make separate methods for each Actor type
    this._prepareCharacterData(actorData);
  }

  _prepareCharacterData(actorData) {
    if (actorData.type !== 'character') return;

    const systemData = actorData.system;
    
    // Calculate any derived values here if needed
  }

  async rollAttribute(attributeKey) {
    const attribute = this.system.attributes[attributeKey];
    if (!attribute) return;

    const numDice = attribute.dice;
    const label = `${this.name} - ${attributeKey.charAt(0).toUpperCase() + attributeKey.slice(1)}`;
    
    const result = await game.roleandroll.rollDicePool(numDice, label);
    
    // Check if roll succeeded based on succeed checkbox
    if (result && result.successes > 0 && !attribute.succeed) {
      ui.notifications.info(`${label}: ${result.successes} successes!`);
    }
    
    return result;
  }

  async rollAbility(category, abilityKey) {
    const ability = this.system.abilities[category]?.[abilityKey];
    if (!ability) return;

    const numDice = ability.dice;
    const label = `${this.name} - ${abilityKey}`;
    
    const result = await game.roleandroll.rollDicePool(numDice, label);
    
    if (result && result.successes > 0 && !ability.succeed) {
      ui.notifications.info(`${label}: ${result.successes} successes!`);
    }
    
    return result;
  }

  async rollSkill(skillName) {
    const skill = this.system.skills.find(s => s.name === skillName);
    if (!skill) return;

    const numDice = skill.dice || 1;
    const label = `${this.name} - ${skillName}`;
    
    return await game.roleandroll.rollDicePool(numDice, label);
  }
}