// module/sheets/actor-sheet.mjs

export class RoleAndRollActorSheet extends ActorSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["role-and-roll", "sheet", "actor"],
      template: "systems/role-and-roll/templates/actor/actor-sheet.hbs",
      width: 920,
      height: 840,
      tabs: [
        { navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "attributes" }
      ],
      scrollY: [".sheet-body"]
    });
  }

  getData() {
    const context = super.getData();
    const actorData = this.actor.toObject(false);

    context.actor = this.actor;
    context.system = actorData.system;
    context.flags = actorData.flags;
    context.config = CONFIG.ROLEANDROLL ?? {};

    const skills = actorData.system.skills ?? [];
    context.skills = Array.isArray(skills) ? skills : Object.values(skills);

    context.items = actorData.items?.sort((a, b) => (a.sort || 0) - (b.sort || 0)) ?? [];

    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    html.find(".attribute-roll").click(ev => this._onAttributeRoll(ev));
    html.find(".ability-roll").click(ev => this._onAbilityRoll(ev));
    html.find(".dice-control").click(ev => this._onDiceControl(ev));
    html.find(".pip").click(ev => this._onDiceControl(ev));

    // Right-click on pip to decrease pip value by 1
    html.find(".pip").contextmenu(ev => this._onPipContextMenu(ev));

    // Skill controls
    html.find(".skill-show-btn").click(ev => this._onSkillShow(ev));

    // Equipment controls
    html.find(".quantity-btn").click(ev => this._onQuantityChange(ev));
    html.find(".weight-input").change(ev => this._onWeightChange(ev));
    html.find(".item-show-chat").click(ev => this._onItemShowChat(ev));

    html.find(".item-create").click(ev => this._onItemCreate(ev));
    html.find(".item-delete").click(ev => this._onItemDelete(ev));
    html.find(".item-edit").click(ev => this._onItemEdit(ev));

    // Profile image click to show in popout

    // Profile image edit click
    html.find(".profile-img-edit").click(ev => this._onEditImage(ev));
    html.find('.profile-img').click(ev => {
      ev.stopPropagation();
      const src = ev.currentTarget.src;

      // new ImagePopout(src, {
      //   title: this.actor.name
      // }).render(true);
    });

    // IMAGE PREVIEW ONLY
    html.find('.preview-only').on('click', ev => {
      ev.preventDefault();
      ev.stopPropagation();
      new ImagePopout(this.actor.img, {
        title: this.actor.name
      }).render(true);
    });

    // PENCIL = OPEN FILE PICKER
    html.find('.profile-img-edit-btn').on('click', ev => {
      ev.preventDefault();
      ev.stopPropagation();
      html.find('.hidden-img-editor').click();
    });


  }

  _onShowProfileImage(event) {
    event.preventDefault();
    const img = this.actor.img;
    new ImagePopout(img, {
      title: this.actor.name,
      uuid: this.actor.uuid
    }).render(true);
  }


  async _onAttributeRoll(event) {
    event.preventDefault();
    const key = event.currentTarget.dataset.attribute;
    if (key) await this.actor.rollAttribute(key);
  }

  async _onAbilityRoll(event) {
    event.preventDefault();
    const { category, ability } = event.currentTarget.dataset;
    if (category && ability) await this.actor.rollAbility(category, ability);
  }

  async _onPipContextMenu(event) {
    event.preventDefault();
    const { target, value: dataValue } = event.currentTarget.dataset;
    if (!target) return;

    const path = target.split(".");
    let obj = this.actor.system;

    for (let i = 0; i < path.length - 1; i++) {
      obj = obj?.[path[i]];
      if (!obj) return;
    }

    const last = path[path.length - 1];
    let currentValue = Number(obj[last] ?? 0);
    const pipValue = Number(dataValue) || 0;

    // Only decrease if right-clicking on a filled pip
    if (pipValue <= currentValue && currentValue > 0) {
      await this.actor.update({ [`system.${target}`]: currentValue - 1 });
    }
  }

  async _onDiceControl(event) {
    event.preventDefault();
    const { action, target, value: dataValue } = event.currentTarget.dataset;
    if (!target) return;

    const path = target.split(".");
    let obj = this.actor.system;

    for (let i = 0; i < path.length - 1; i++) {
      obj = obj?.[path[i]];
      if (!obj) return;
    }

    const last = path[path.length - 1];
    let value = Number(obj[last] ?? 0);

    if (action === "increase" && value < 6) value++;
    if (action === "decrease" && value > 0) value--;
    if (action === "set-dice") value = Number(dataValue) || 0;

    await this.actor.update({ [`system.${target}`]: value });
  }

  async _onItemCreate(event) {
    const type = event.currentTarget.dataset.type;

    if (type === "skill") {
      const skills = Array.isArray(this.actor.system.skills)
        ? foundry.utils.duplicate(this.actor.system.skills)
        : [];

      skills.push({
        name: `Skill ${skills.length + 1}`,
        description: ""
      });

      await this.actor.update({ "system.skills": skills });
      this.render(true);
      return;
    }

    await this.actor.createEmbeddedDocuments("Item", [
      { name: `New ${type}`, type, system: {} }
    ]);

    this.render(true);
  }

  async _onItemDelete(event) {
    const skillIndex = event.currentTarget.dataset.index;

    if (skillIndex !== undefined) {
      const skills = Array.from(this.actor.system.skills ?? []);
      skills.splice(Number(skillIndex), 1);
      await this.actor.update({ "system.skills": skills });
      this.render(true);
      return;
    }

    const li = event.currentTarget.closest(".item");
    const id = li?.dataset?.itemId;
    if (!id) return;

    await this.actor.deleteEmbeddedDocuments("Item", [id]);
    this.render(true);
  }

  async _onItemEdit(event) {
    const li = event.currentTarget.closest(".item");
    const item = this.actor.items.get(li?.dataset?.itemId);
    if (item) item.sheet.render(true);
  }

  async _onSkillShow(event) {
    event.preventDefault();
    const index = event.currentTarget.dataset.index;
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

  async _onQuantityChange(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const itemId = button.dataset.itemId;
    const action = button.dataset.action;
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

  async _onItemShowChat(event) {
    event.preventDefault();
    const itemId = event.currentTarget.dataset.itemId;
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
}
