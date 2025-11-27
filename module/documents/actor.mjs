// module/documents/actor.mjs

export class RoleAndRollActor extends Actor {

  /* -------------------------------------------- */
  /*  OVERRIDE SCHEMA (V13 SAFE)
  /* -------------------------------------------- */

  static defineSchema() {
    const fields = super.defineSchema();

    // Fix Actor image validation
    fields.img = new foundry.data.fields.StringField({
      required: false,
      blank: true,
      initial: "icons/svg/mystery-man.svg",
      validate: v => {
        if (!v) return true;
        return (
          v.startsWith("blob:") ||
          v.startsWith("data:image/") ||
          v.match(/\.(png|jpg|jpeg|webp|svg)$/i)
        );
      }
    });

    // Fix Prototype Token image validation (THIS WAS THE LAST ERROR)
    if (fields.prototypeToken) {
      const proto = fields.prototypeToken.fields;

      if (proto.texture) {
        proto.texture.fields.src = new foundry.data.fields.StringField({
          required: false,
          blank: true,
          validate: v => {
            if (!v) return true;
            return (
              v.startsWith("blob:") ||
              v.startsWith("data:image/") ||
              v.match(/\.(png|jpg|jpeg|webp|svg)$/i)
            );
          }
        });
      }
    }

    return fields;
  }

  /* -------------------------------------------- */
  /*  PREP DATA
  /* -------------------------------------------- */

  prepareData() {
    super.prepareData();
  }

  prepareBaseData() { }

  prepareDerivedData() {
    if (this.type !== "character") return;

    const system = this.system;

    system.health ??= { value: 0, max: 0 };
    system.mental ??= { value: 0, max: 0 };
    system.attributes ??= {};
    system.abilities ??= {};
    system.skills ??= [];
  }

  /* -------------------------------------------- */
  /*  ROLLS
  /* -------------------------------------------- */

  async rollAttribute(attributeKey) {
    const attribute = this.system.attributes?.[attributeKey];
    if (!attribute) return;

    const numDice = Number(attribute.dice) || 0;
    const autoSuccess = attribute.succeed ? 1 : 0;

    const localizedName =
      game.roleandroll?.safeCapitalize?.(attributeKey) || attributeKey;
    const englishName =
      game.i18n._fallback?.ROLEANDROLL?.Attributes?.[attributeKey] || attributeKey;

    const showEn = game.i18n.lang !== "en" && localizedName !== englishName;

    const label = showEn
      ? `${localizedName} (${englishName}) [${numDice}]`
      : `${localizedName} [${numDice}]`;

    return await game.roleandroll.rollDicePool(numDice, label, autoSuccess, this);
  }

  async rollAbility(category, abilityKey) {
    const ability = this.system.abilities?.[category]?.[abilityKey];
    if (!ability) return;

    const numDice = Number(ability.dice) || 0;
    const autoSuccess = ability.succeed ? 1 : 0;

    const localizedName =
      game.roleandroll?.safeCapitalize?.(abilityKey) || abilityKey;
    const englishName =
      game.i18n._fallback?.ROLEANDROLL?.Abilities?.[abilityKey] || abilityKey;

    const showEn = game.i18n.lang !== "en" && localizedName !== englishName;

    const label = showEn
      ? `${localizedName} (${englishName}) [${numDice}]`
      : `${localizedName} [${numDice}]`;

    return await game.roleandroll.rollDicePool(numDice, label, autoSuccess, this);
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
