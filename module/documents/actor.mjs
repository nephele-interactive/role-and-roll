// module/documents/actor.mjs

export class RoleAndRollActor extends Actor {

  prepareData() {
    super.prepareData();
  }

  prepareBaseData() {}

  prepareDerivedData() {
    if (this.type !== "character") return;

    const system = this.system;

    // Safe defaults for v13
    system.health ??= 0;
    system.mental ??= 0;
    system.attributes ??= {};
    system.abilities ??= {};
    system.skills ??= [];
  }

  async rollAttribute(attributeKey) {
    const attribute = this.system.attributes?.[attributeKey];
    if (!attribute) return;

    const numDice = Number(attribute.dice) || 0;
    const label = `${this.name} - ${attributeKey}`;

    return await game.roleandroll.rollDicePool(numDice, label);
  }

  async rollAbility(category, abilityKey) {
    const ability = this.system.abilities?.[category]?.[abilityKey];
    if (!ability) return;

    const numDice = Number(ability.dice) || 0;
    const label = `${this.name} - ${abilityKey}`;

    return await game.roleandroll.rollDicePool(numDice, label);
  }

  async rollSkill(skillName) {
    const skills = Array.isArray(this.system.skills)
      ? this.system.skills
      : Object.values(this.system.skills ?? {});

    const skill = skills.find(s => s.name === skillName);
    if (!skill) return;

    const numDice = Number(skill.dice) || 1;
    const label = `${this.name} - ${skillName}`;

    return await game.roleandroll.rollDicePool(numDice, label);
  }
}
