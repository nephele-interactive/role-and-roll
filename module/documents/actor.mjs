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
    system.wp ??= { value: 0, max: 0 };
    system.attributes ??= {};
    system.abilities ??= {};
    system.skills ??= [];
    system.level ??= 1;

    // Calculate HP Max = 10 + (toughness*2) + (3 if toughness succeeded)
    const toughness = Number(system.attributes.toughness?.dice) || 1;
    const toughnessSucceed = system.attributes.toughness?.succeed ? 3 : 0;
    system.health.max = 10 + (toughness * 2) + toughnessSucceed;

    // Calculate WP Max = 8 + sanity + (2 if sanity succeeded)
    const sanity = Number(system.attributes.sanity?.dice) || 1;
    const sanitySucceed = system.attributes.sanity?.succeed ? 2 : 0;
    system.wp.max = 8 + sanity + sanitySucceed;
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

    // Import and show dice control dialog
    const { DiceControlDialog } = await import("../dice-control-dialog.mjs");
    const dialog = new DiceControlDialog(numDice, label, autoSuccess, this);
    dialog.render(true);
  }

  async rollAbility(category, abilityKey) {
    const ability = this.system.abilities?.[category]?.[abilityKey];
    if (!ability) return;

    let abilityDice = Number(ability.dice) || 0;
    let autoSuccess = ability.succeed ? 1 : 0;

    // Get attribute configuration
    const attributeMode = ability.attributeMode || 'single';
    const attributes = ability.attributes || [];

    // Count unique attributes with succeed=true as bonus successes
    // Each unique attribute that has succeed counts as +1
    const uniqueAttributesWithSucceed = new Set();
    for (const attrKey of attributes) {
      const attr = this.system.attributes?.[attrKey];
      if (attr?.succeed) {
        uniqueAttributesWithSucceed.add(attrKey);
      }
    }
    autoSuccess += uniqueAttributesWithSucceed.size;

    // Calculate total dice based on attribute mode
    let totalDice = abilityDice;
    let attributeBonus = 0;
    let selectedAttribute = null;

    if (attributeMode === 'single' && attributes.length > 0) {
      // Single mode: add the one attribute
      const attrKey = attributes[0];
      const attrValue = Number(this.system.attributes?.[attrKey]?.dice) || 0;
      attributeBonus = attrValue;
      totalDice = abilityDice + attrValue;
      selectedAttribute = attrKey;
    } else if (attributeMode === 'dual' && attributes.length >= 2) {
      // Dual mode: add both attributes
      const attr1Value = Number(this.system.attributes?.[attributes[0]]?.dice) || 0;
      const attr2Value = Number(this.system.attributes?.[attributes[1]]?.dice) || 0;
      attributeBonus = attr1Value + attr2Value;
      totalDice = abilityDice + attr1Value + attr2Value;
      selectedAttribute = `${attributes[0]}+${attributes[1]}`;
    } else if (attributeMode === 'select' && attributes.length > 1) {
      // Select mode: let user choose which attribute
      // For now, we'll show a dialog to let them pick
      const choices = {};
      for (const attrKey of attributes) {
        const attrValue = Number(this.system.attributes?.[attrKey]?.dice) || 0;
        const attrName = game.roleandroll?.safeCapitalize?.(attrKey) || attrKey;
        choices[attrKey] = `${attrName} ${game.i18n.format("ROLEANDROLL.Notifications.AttributeBonus", { value: attrValue })}`;
      }

      // Show selection dialog
      selectedAttribute = await new Promise((resolve) => {
        new Dialog({
          title: game.i18n.localize("ROLEANDROLL.Notifications.SelectAttribute"),
          content: `<p>${game.i18n.localize("ROLEANDROLL.Notifications.SelectAttributePrompt")}</p>`,
          buttons: Object.keys(choices).reduce((acc, key) => {
            acc[key] = {
              label: choices[key],
              callback: () => resolve(key)
            };
            return acc;
          }, {}),
          default: attributes[0],
          close: () => resolve(attributes[0]) // Default to first if closed
        }).render(true);
      });

      const attrValue = Number(this.system.attributes?.[selectedAttribute]?.dice) || 0;
      attributeBonus = attrValue;
      totalDice = abilityDice + attrValue;
    }

    const localizedName =
      game.roleandroll?.safeCapitalize?.(abilityKey) || abilityKey;
    const englishName =
      game.i18n._fallback?.ROLEANDROLL?.Abilities?.[abilityKey] || abilityKey;

    const showEn = game.i18n.lang !== "en" && localizedName !== englishName;

    // Build label showing ability + attribute breakdown
    let label = showEn
      ? `${localizedName} (${englishName})`
      : `${localizedName}`;

    if (attributeBonus > 0 && selectedAttribute) {
      const attrDisplayName = game.roleandroll?.safeCapitalize?.(selectedAttribute) || selectedAttribute;
      label += ` [${abilityDice} + ${attributeBonus} (${attrDisplayName}) = ${totalDice}]`;
    } else {
      label += ` [${totalDice}]`;
    }

    // Import and show dice control dialog with total dice
    const { DiceControlDialog } = await import("../dice-control-dialog.mjs");
    const dialog = new DiceControlDialog(totalDice, label, autoSuccess, this);
    dialog.render(true);
  }

  async rollSessionAbility(abilityKey) {
    const customAbilities = game.settings.get("role-and-roll", "customSessionAbilities") || {};
    const config = customAbilities[abilityKey];
    if (!config) return;
    // Initialize if not exists
    this.system.sessionAbilities ??= {};
    this.system.sessionAbilities[abilityKey] ??= { dice: 0, succeed: false };
    const sessionAbility = this.system.sessionAbilities[abilityKey];
    let abilityDice = Number(sessionAbility.dice) || 0;
    let autoSuccess = sessionAbility.succeed ? 1 : 0;
    const mode = config.mode || 'single';
    const baseAbilities = config.baseAbilities || [];
    let totalDice = abilityDice;
    let attributeBonus = 0;
    let selectedAbility = null;
    let bonusDetails = [];
    // Collect all abilities/attributes to include (with recursive lookup)
    const abilitiesToInclude = [];

    if (mode === 'single' && baseAbilities.length > 0) {
      // Use only the first base ability/attribute
      abilitiesToInclude.push(baseAbilities[0]);
      selectedAbility = baseAbilities[0];
    } else if (mode === 'dual' && baseAbilities.length > 0) {
      // Use ALL base abilities/attributes
      abilitiesToInclude.push(...baseAbilities);
      selectedAbility = baseAbilities.join('+');
    } else if (mode === 'select' && baseAbilities.length > 1) {
      // Let user choose one - calculate total dice for each option including recursive attributes
      const choices = {};
      for (const baseKey of baseAbilities) {
        // Calculate total dice for this option (including underlying attributes)
        let totalDiceForOption = 0;
        const processedForOption = new Set();
        const queueForOption = [baseKey];
        
        while (queueForOption.length > 0) {
          const key = queueForOption.shift();
          if (processedForOption.has(key)) continue;
          processedForOption.add(key);
          
          const data = this._getAbilityOrAttributeData(key);
          totalDiceForOption += data.dice;
          
          // If this is an ability, add its underlying attributes
          if (!data.isAttribute && data.attributes && data.attributes.length > 0) {
            for (const attrKey of data.attributes) {
              if (!processedForOption.has(attrKey)) {
                queueForOption.push(attrKey);
              }
            }
          }
        }
        
        const baseName = game.roleandroll?.safeCapitalize?.(baseKey) || baseKey;
        choices[baseKey] = `${baseName} ${game.i18n.format("ROLEANDROLL.Notifications.AttributeBonus", { value: totalDiceForOption })}`;
      }

      selectedAbility = await new Promise((resolve) => {
        new Dialog({
          title: game.i18n.localize("ROLEANDROLL.Notifications.SelectAttribute"),
          content: `<p>${game.i18n.localize("ROLEANDROLL.Notifications.SelectAttributePrompt")}</p>`,
          buttons: Object.keys(choices).reduce((acc, key) => {
            acc[key] = {
              label: choices[key],
              callback: () => resolve(key)
            };
            return acc;
          }, {}),
          default: baseAbilities[0],
          close: () => resolve(baseAbilities[0])
        }).render(true);
      });

      abilitiesToInclude.push(selectedAbility);
    }
    // For each ability to include, get its data AND recursively find underlying attributes
    const processed = new Set();
    const queue = [...abilitiesToInclude];
    while (queue.length > 0) {
      const key = queue.shift();
      if (processed.has(key)) continue;
      processed.add(key);
      const data = this._getAbilityOrAttributeData(key);
      attributeBonus += data.dice;
      if (data.succeed) autoSuccess++;
      bonusDetails.push({ key, dice: data.dice, isAttribute: data.isAttribute });
      // If this is an ability (not attribute), check if it has underlying attributes
      if (!data.isAttribute && data.attributes && data.attributes.length > 0) {
        // Add the underlying attributes to the queue for processing
        for (const attrKey of data.attributes) {
          if (!processed.has(attrKey)) {
            queue.push(attrKey);
          }
        }
      }
    }
    totalDice = abilityDice + attributeBonus;
    // Build label
    let label = config.name || abilityKey;
    if (bonusDetails.length > 0) {
      const baseLabel = bonusDetails.map(b => game.roleandroll?.safeCapitalize?.(b.key) || b.key).join(' + ');
      label += ` [${abilityDice} + ${attributeBonus} (${baseLabel}) = ${totalDice}]`;
    } else {
      label += ` [${totalDice}]`;
    }
    // Show dice control dialog
    const { DiceControlDialog } = await import("../dice-control-dialog.mjs");
    const dialog = new DiceControlDialog(totalDice, label, autoSuccess, this);
    dialog.render(true);
  }
  // Helper to get ability or attribute data
  _getAbilityOrAttributeData(key) {
    // First check if it's an attribute
    const attribute = this.system.attributes?.[key];
    if (attribute) {
      return {
        dice: Number(attribute.dice) || 0,
        succeed: attribute.succeed || false,
        isAttribute: true,
        attributes: [] // Attributes don't have sub-attributes
      };
    }
    // Then check in all ability categories
    for (const category in this.system.abilities) {
      const ability = this.system.abilities[category]?.[key];
      if (ability) {
        return {
          dice: Number(ability.dice) || 0,
          succeed: ability.succeed || false,
          isAttribute: false,
          attributes: ability.attributes || [] // Return the attributes this ability is based on
        };
      }
    }
    // Not found, return defaults
    return { dice: 0, succeed: false, isAttribute: false, attributes: [] };
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
