// module/sheets/actor-sheet.mjs

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export class RoleAndRollActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["role-and-roll", "sheet", "actor"],
    position: { width: 920, height: 840 },
    window: { resizable: true },
    tag: "form",
    form: {
      submitOnChange: true,
      closeOnSubmit: false
    },
    actions: {
      attributeRoll: RoleAndRollActorSheet.#onAttributeRoll,
      abilityRoll: RoleAndRollActorSheet.#onAbilityRoll,
      sessionAbilityRoll: RoleAndRollActorSheet.#onSessionAbilityRoll,
      diceControl: RoleAndRollActorSheet.#onDiceControl,
      pipClick: RoleAndRollActorSheet.#onPipClick,
      itemCreate: RoleAndRollActorSheet.#onItemCreate,
      itemDelete: RoleAndRollActorSheet.#onItemDelete,
      itemEdit: RoleAndRollActorSheet.#onItemEdit,
      skillShow: RoleAndRollActorSheet.#onSkillShow,
      quantityChange: RoleAndRollActorSheet.#onQuantityChange,
      itemShowChat: RoleAndRollActorSheet.#onItemShowChat,
      editProfileImage: RoleAndRollActorSheet.#onEditProfileImage,
      previewImage: RoleAndRollActorSheet.#onPreviewImage,
      togglePortraitView: RoleAndRollActorSheet.#onTogglePortraitView
    }
  };

  static PARTS = {
    sheet: {
      template: "systems/role-and-roll/templates/actor/actor-sheet.hbs",
      scrollable: [".rnr-main"]
    }
  };

  _portraitView = "portrait";

  tabGroups = {
    primary: "attributes"
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actorData = this.actor.toObject(false);

    context.actor = this.actor;
    context.system = actorData.system;
    context.flags = actorData.flags;
    context.config = CONFIG.ROLEANDROLL ?? {};
    context.editable = this.isEditable;
    context.portraitView = this._portraitView || "portrait";

    const skills = actorData.system.skills ?? [];
    context.skills = Array.isArray(skills) ? skills : Object.values(skills);
    context.sessionAbilitiesEnabled = game.settings.get("role-and-roll", "sessionAbilitiesEnabled");
    context.customSessionAbilities = game.settings.get("role-and-roll", "customSessionAbilities") || {};

    // Pass session abilities data to context for rendering
    context.sessionAbilitiesData = this.actor.system.sessionAbilities || {};

    context.items = actorData.items?.sort((a, b) => (a.sort || 0) - (b.sort || 0)) ?? [];

    // Initialize session abilities if needed
    const sessionEnabled = context.sessionAbilitiesEnabled;
    if (sessionEnabled) {
      const customAbilities = context.customSessionAbilities;
      const currentSessionAbilities = this.actor.system.sessionAbilities || {};
      let hasChanges = false;

      for (const key in customAbilities) {
        if (!currentSessionAbilities[key]) {
          currentSessionAbilities[key] = { dice: 0, succeed: false };
          hasChanges = true;
        }
      }

      if (hasChanges) {
        await this.actor.update({ 'system.sessionAbilities': currentSessionAbilities });
      }
    }

    // Calculate bar fill percentages for dynamic HP/Mental/WP bars
    const sys = actorData.system;
    context.hpPercent = sys.health?.max > 0 ? Math.round((sys.health.value / sys.health.max) * 100) : 0;
    context.mentalPercent = sys.mental?.max > 0 ? Math.round((sys.mental.value / sys.mental.max) * 100) : 0;
    context.wpPercent = sys.wp?.max > 0 ? Math.round((sys.wp.value / sys.wp.max) * 100) : 0;

    return context;
  }

  _onRender(context, options) {
    super._onRender(context, options);

    // Move tabs outside window-content to the application root element
    // so they can float outside the sheet (like D&D 5e)
    this._attachFloatingTabs();

    // Tab management
    this._initializeTabs();

    if (!this.isEditable) return;


    // Right-click on pip to decrease pip value by 1
    this.element.querySelectorAll("[data-action='pipClick']").forEach(pip => {
      pip.addEventListener("contextmenu", this._onPipContextMenu.bind(this));
    });

    // Validate value doesn't exceed max for health
    const healthInput = this.element.querySelector('input[name="system.health.value"]');
    if (healthInput) {
      healthInput.addEventListener('change', (ev) => {
        const value = Number(ev.currentTarget.value);
        const max = Number(this.actor.system.health.max);
        if (value > max) {
          ev.currentTarget.value = max;
          this.actor.update({ 'system.health.value': max });
        } else if (value < 0) {
          ev.currentTarget.value = 0;
          this.actor.update({ 'system.health.value': 0 });
        }
      });
    }

    // Validate wp
    const wpInput = this.element.querySelector('input[name="system.wp.value"]');
    if (wpInput) {
      wpInput.addEventListener('change', (ev) => {
        const value = Number(ev.currentTarget.value);
        const max = Number(this.actor.system.wp.max);
        if (value > max) {
          ev.currentTarget.value = max;
          this.actor.update({ 'system.wp.value': max });
        } else if (value < 0) {
          ev.currentTarget.value = 0;
          this.actor.update({ 'system.wp.value': 0 });
        }
      });
    }

    // Validate mental
    const mentalInput = this.element.querySelector('input[name="system.mental.value"]');
    if (mentalInput) {
      mentalInput.addEventListener('change', (ev) => {
        const value = Number(ev.currentTarget.value);
        const max = Number(this.actor.system.mental.max);
        if (value > max) {
          ev.currentTarget.value = max;
          this.actor.update({ 'system.mental.value': max });
        } else if (value < 0) {
          ev.currentTarget.value = 0;
          this.actor.update({ 'system.mental.value': 0 });
        }
      });
    }

    // Weight input change
    this.element.querySelectorAll(".weight-input").forEach(input => {
      input.addEventListener("change", this._onWeightChange.bind(this));
    });
  }

  _attachFloatingTabs() {
    // Remove any previously moved tabs (from prior renders)
    this.element.querySelectorAll(':scope > .rnr-tabs').forEach(old => old.remove());

    // Find the new tabs inside the rendered template
    const windowContent = this.element.querySelector('.window-content');
    const tabNav = windowContent?.querySelector('.rnr-tabs');
    if (!tabNav) return;

    // Move tabs to the application root element (outside window-content)
    this.element.appendChild(tabNav);

    // Force overflow visible on the application window container so tabs can extend beyond the sheet boundary.
    // We do NOT set overflow: visible on windowContent because it must remain overflow: hidden to allow internal sheet scrolling.
    this.element.style.overflow = 'visible';
    if (windowContent) windowContent.style.overflow = '';
  }

  _initializeTabs() {
    const group = "primary";
    const activeTab = this.tabGroups[group] || "attributes";
    const nav = this.element.querySelector('.rnr-tabs[data-group="primary"]');
    const body = this.element.querySelector('.rnr-main');
    if (!nav || !body) return;

    // Set active tab nav
    nav.querySelectorAll(".rnr-tab[data-tab]").forEach(tab => {
      tab.classList.toggle("active", tab.dataset.tab === activeTab);
    });

    // Set active tab content
    body.querySelectorAll(".tab[data-tab]").forEach(panel => {
      panel.classList.toggle("active", panel.dataset.tab === activeTab);
    });

    // Handle tab clicks
    nav.querySelectorAll(".rnr-tab[data-tab]").forEach(tab => {
      tab.addEventListener("click", (ev) => {
        ev.preventDefault();
        const tabName = ev.currentTarget.dataset.tab;
        this.tabGroups[group] = tabName;

        nav.querySelectorAll(".rnr-tab[data-tab]").forEach(t => {
          t.classList.toggle("active", t.dataset.tab === tabName);
        });
        body.querySelectorAll(".tab[data-tab]").forEach(p => {
          p.classList.toggle("active", p.dataset.tab === tabName);
        });
      });
    });
  }

  _onClose(options) {
    return super._onClose(options);
  }

  _prepareSubmitData(event, form, formData) {
    const submitData = super._prepareSubmitData(event, form, formData);

    // If system.skills is submitted as an object (due to expanded inputs like system.skills.0.name),
    // merge it into the existing skills array to prevent wiping other skills or fields.
    if (submitData.system && ("skills" in submitData.system)) {
      const skillsData = submitData.system.skills;
      if (skillsData && typeof skillsData === "object" && !Array.isArray(skillsData)) {
        const currentSkills = this.actor.system.skills ?? [];
        const mergedSkills = foundry.utils.duplicate(Array.isArray(currentSkills) ? currentSkills : Object.values(currentSkills));

        for (const [key, value] of Object.entries(skillsData)) {
          const index = Number(key);
          if (isNaN(index)) continue;
          if (!mergedSkills[index]) {
            mergedSkills[index] = { name: "", description: "" };
          }
          mergedSkills[index] = foundry.utils.mergeObject(mergedSkills[index], value);
        }

        submitData.system.skills = mergedSkills;
      }
    }

    // Merge sessionAbilities object updates to support custom dynamic keys
    if (submitData.system && ("sessionAbilities" in submitData.system)) {
      const currentSessionAbilities = this.actor.system.sessionAbilities || {};
      submitData.system.sessionAbilities = foundry.utils.mergeObject(
        foundry.utils.duplicate(currentSessionAbilities),
        submitData.system.sessionAbilities
      );
    }

    return submitData;
  }

  /* ---- Action Handlers ---- */

  static async #onAttributeRoll(event, target) {
    event.preventDefault();
    const key = target.dataset.attribute;
    if (key) await this.actor.rollAttribute(key);
  }

  static async #onAbilityRoll(event, target) {
    event.preventDefault();
    const { category, ability } = target.dataset;
    if (category && ability) await this.actor.rollAbility(category, ability);
  }

  static async #onSessionAbilityRoll(event, target) {
    event.preventDefault();
    const abilityKey = target.dataset.ability;
    if (abilityKey) await this.actor.rollSessionAbility(abilityKey);
  }

  static async #onDiceControl(event, target) {
    console.log("RoleAndRoll | #onDiceControl called", { event, target });
    event.preventDefault();
    const { action, target: dataTarget, value: dataValue } = target.dataset;
    if (!dataTarget) {
      console.warn("RoleAndRoll | #onDiceControl: dataTarget is missing");
      return;
    }

    const path = dataTarget.split(".");
    let obj = this.actor.system;

    for (let i = 0; i < path.length - 1; i++) {
      obj = obj?.[path[i]];
    }

    const last = path[path.length - 1];
    const isAttributeDice = dataTarget.startsWith("attributes.") && last === "dice";
    const minValue = isAttributeDice ? 1 : 0;

    let value = Number(obj?.[last] ?? minValue);
    console.log("RoleAndRoll | #onDiceControl state", { path, last, minValue, value, obj });

    if (action === "increase" && value < 6) value++;
    if (action === "decrease" && value > minValue) value--;
    if (action === "set-dice") {
      value = Number(dataValue) || minValue;
      if (value < minValue) value = minValue;
    }

    console.log(`RoleAndRoll | #onDiceControl: updating system.${dataTarget} to ${value}`);
    try {
      if (dataTarget.startsWith("sessionAbilities.")) {
        const abilityKey = path[1];
        const field = path[2];
        const sessionAbilities = foundry.utils.duplicate(this.actor.system.sessionAbilities || {});
        if (!sessionAbilities[abilityKey]) sessionAbilities[abilityKey] = { dice: 0, succeed: false };
        sessionAbilities[abilityKey][field] = value;

        const updateData = { "system.sessionAbilities": sessionAbilities };
        console.log("RoleAndRoll | #onDiceControl update payload (sessionAbilities):", updateData);
        await this.actor.update(updateData);
      } else {
        const updateData = { [`system.${dataTarget}`]: value };
        console.log("RoleAndRoll | #onDiceControl update payload:", updateData);
        await this.actor.update(updateData);
      }
      console.log("RoleAndRoll | #onDiceControl update success");
    } catch (err) {
      console.error("RoleAndRoll | #onDiceControl update failed", err);
    }

    // Force re-render for session abilities to update UI
    if (dataTarget.startsWith("sessionAbilities.")) {
      this.render(false);
    }
  }

  static async #onPipClick(event, target) {
    console.log("RoleAndRoll | #onPipClick called", { event, target });
    // Pip click is the same as dice control with set-dice action
    event.preventDefault();
    const { target: dataTarget, value: dataValue } = target.dataset;
    if (!dataTarget) {
      console.warn("RoleAndRoll | #onPipClick: dataTarget is missing");
      return;
    }

    const path = dataTarget.split(".");
    const last = path[path.length - 1];
    const isAttributeDice = dataTarget.startsWith("attributes.") && last === "dice";
    const minValue = isAttributeDice ? 1 : 0;

    let value = Number(dataValue) || minValue;
    if (value < minValue) value = minValue;

    console.log(`RoleAndRoll | #onPipClick: updating system.${dataTarget} to ${value}`);
    try {
      if (dataTarget.startsWith("sessionAbilities.")) {
        const abilityKey = path[1];
        const field = path[2];
        const sessionAbilities = foundry.utils.duplicate(this.actor.system.sessionAbilities || {});
        if (!sessionAbilities[abilityKey]) sessionAbilities[abilityKey] = { dice: 0, succeed: false };
        sessionAbilities[abilityKey][field] = value;

        const updateData = { "system.sessionAbilities": sessionAbilities };
        console.log("RoleAndRoll | #onPipClick update payload (sessionAbilities):", updateData);
        await this.actor.update(updateData);
      } else {
        const updateData = { [`system.${dataTarget}`]: value };
        console.log("RoleAndRoll | #onPipClick update payload:", updateData);
        await this.actor.update(updateData);
      }
      console.log("RoleAndRoll | #onPipClick update success");
    } catch (err) {
      console.error("RoleAndRoll | #onPipClick update failed", err);
    }

    // Force re-render for session abilities to update UI
    if (dataTarget.startsWith("sessionAbilities.")) {
      this.render(false);
    }
  }

  async _onPipContextMenu(event) {
    console.log("RoleAndRoll | _onPipContextMenu called", { event });
    event.preventDefault();
    const { target: dataTarget, value: dataValue } = event.currentTarget.dataset;
    if (!dataTarget) {
      console.warn("RoleAndRoll | _onPipContextMenu: dataTarget is missing");
      return;
    }

    const path = dataTarget.split(".");
    let obj = this.actor.system;

    for (let i = 0; i < path.length - 1; i++) {
      obj = obj?.[path[i]];
    }

    const last = path[path.length - 1];
    const isAttributeDice = dataTarget.startsWith("attributes.") && last === "dice";
    const minValue = isAttributeDice ? 1 : 0;

    let currentValue = Number(obj?.[last] ?? minValue);
    const pipValue = Number(dataValue) || 0;
    console.log("RoleAndRoll | _onPipContextMenu state", { path, last, minValue, currentValue, pipValue });

    // Only decrease if right-clicking on a filled pip and value is above minimum
    if (pipValue <= currentValue && currentValue > minValue) {
      const targetValue = currentValue - 1;
      console.log(`RoleAndRoll | _onPipContextMenu: updating system.${dataTarget} to ${targetValue}`);
      try {
        if (dataTarget.startsWith("sessionAbilities.")) {
          const abilityKey = path[1];
          const field = path[2];
          const sessionAbilities = foundry.utils.duplicate(this.actor.system.sessionAbilities || {});
          if (!sessionAbilities[abilityKey]) sessionAbilities[abilityKey] = { dice: 0, succeed: false };
          sessionAbilities[abilityKey][field] = targetValue;

          const updateData = { "system.sessionAbilities": sessionAbilities };
          console.log("RoleAndRoll | _onPipContextMenu update payload (sessionAbilities):", updateData);
          await this.actor.update(updateData);
        } else {
          const updateData = { [`system.${dataTarget}`]: targetValue };
          console.log("RoleAndRoll | _onPipContextMenu update payload:", updateData);
          await this.actor.update(updateData);
        }
        console.log("RoleAndRoll | _onPipContextMenu update success");
      } catch (err) {
        console.error("RoleAndRoll | _onPipContextMenu update failed", err);
      }
    }
  }

  static async #onItemCreate(event, target) {
    const type = target.dataset.type;

    if (type === "skill") {
      // Save any currently edited text (like name or description) first
      await this.submit();

      const currentSkills = this.actor.system.skills ?? [];
      const skills = Array.isArray(currentSkills)
        ? foundry.utils.duplicate(currentSkills)
        : Object.values(foundry.utils.duplicate(currentSkills));

      skills.push({
        name: `Skill ${skills.length + 1}`,
        description: ""
      });

      // Clear existing key in database to prevent merging artifacts
      await this.actor.update({ "system.-=skills": null });
      await this.actor.update({ "system.skills": skills });
      this.render(true);
      return;
    }

    await this.actor.createEmbeddedDocuments("Item", [
      { name: `New ${type}`, type, system: {} }
    ]);

    this.render(true);
  }

  static async #onItemDelete(event, target) {
    const skillIndex = target.dataset.index;

    if (skillIndex !== undefined) {
      // Save any currently edited text (like name or description) first
      await this.submit();

      const currentSkills = this.actor.system.skills ?? [];
      const skills = Array.isArray(currentSkills)
        ? foundry.utils.duplicate(currentSkills)
        : Object.values(foundry.utils.duplicate(currentSkills));

      skills.splice(Number(skillIndex), 1);

      // Clear existing key in database to prevent merging artifacts
      await this.actor.update({ "system.-=skills": null });
      await this.actor.update({ "system.skills": skills });
      this.render(true);
      return;
    }

    const li = target.closest("[data-item-id]");
    const id = li?.dataset?.itemId;
    if (!id) return;

    await this.actor.deleteEmbeddedDocuments("Item", [id]);
    this.render(true);
  }

  static async #onItemEdit(event, target) {
    const li = target.closest("[data-item-id]");
    const item = this.actor.items.get(li?.dataset?.itemId);
    if (item) item.sheet.render(true);
  }

  static async #onSkillShow(event, target) {
    event.preventDefault();
    const index = target.dataset.index;
    const skill = this.actor.system.skills[index];

    if (!skill) return;

    const content = `
      <div class="skill-chat-card">
        <h3>${skill.name || game.i18n.localize("ROLEANDROLL.Labels.SkillName")}</h3>
        <p>${skill.description || ""}</p>
      </div>
    `;

    await ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: content
    });
  }

  static async #onQuantityChange(event, target) {
    event.preventDefault();
    const itemId = target.dataset.itemId;
    const action = target.dataset.qtyAction;
    const item = this.actor.items.get(itemId);

    if (!item) return;

    let quantity = Number(item.system.quantity) || 0;

    if (action === "increase-qty") {
      quantity++;
    } else if (action === "decrease-qty" && quantity > 0) {
      quantity--;
    }

    await item.update({ "system.quantity": quantity });
  }

  async _onWeightChange(event) {
    event.preventDefault();
    const input = event.currentTarget;
    const itemId = input.dataset.itemId;
    const item = this.actor.items.get(itemId);

    if (!item) return;

    const weight = Number(input.value) || 0;
    await item.update({ "system.weight": weight });
  }

  static async #onItemShowChat(event, target) {
    event.preventDefault();
    const itemId = target.dataset.itemId;
    const item = this.actor.items.get(itemId);

    if (!item) return;

    const content = `
      <div class="item-chat-card">
        <div class="item-card-header">
          <img src="${item.img}" alt="${item.name}" />
          <h3>${item.name}</h3>
        </div>
        <div class="item-card-properties">
          <span><strong>${game.i18n.localize("ROLEANDROLL.Labels.Weight")}:</strong> ${item.system.weight || 0}</span>
          <span><strong>${game.i18n.localize("ROLEANDROLL.Labels.Quantity")}:</strong> ${item.system.quantity || 0}</span>
        </div>
        ${item.system.description ? `<div class="item-card-description">${item.system.description}</div>` : ''}
      </div>
    `;

    await ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: content
    });
  }

  static #onTogglePortraitView(event, target) {
    event.preventDefault();
    event.stopPropagation();
    const view = target.dataset.view;
    if (view === "portrait" || view === "token") {
      this._portraitView = view;
      this.render(false);
    }
  }

  static #onEditProfileImage(event, target) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.isEditable) return;

    const isToken = this._portraitView === "token";
    const currentPath = isToken
      ? (this.actor.prototypeToken?.texture?.src || "icons/svg/mystery-man.svg")
      : this.actor.img;

    const fp = new FilePicker({
      type: "image",
      current: currentPath,
      callback: async (path) => {
        if (isToken) {
          await this.actor.update({ "prototypeToken.texture.src": path });
        } else {
          await this.actor.update({ img: path });
        }
      }
    });
    fp.render(true);
  }

  static #onPreviewImage(event, target) {
    event.preventDefault();
    event.stopPropagation();

    const isToken = this._portraitView === "token";
    const path = isToken
      ? (this.actor.prototypeToken?.texture?.src || "icons/svg/mystery-man.svg")
      : this.actor.img;

    new ImagePopout(path, {
      title: this.actor.name
    }).render(true);
  }
}
