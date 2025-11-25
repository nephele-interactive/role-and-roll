export class RoleAndRollActorSheet extends ActorSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["role-and-roll", "sheet", "actor"],
      template: "systems/role-and-roll/templates/actor/actor-sheet.hbs",
      width: 920,
      height: 840,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "attributes" }],
      scrollY: [".sheet-body"],
      dragDrop: [{ dragSelector: ".item", dropSelector: null }]
    });
  }

  get template() {
    return `systems/role-and-roll/templates/actor/actor-sheet.hbs`;
  }

  _normalizeArray(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return Object.values(data);
  }

  getData() {
    const context = super.getData();
    const actorData = this.actor.toObject(false);

    context.actor = this.actor;
    context.system = actorData.system;
    context.flags = actorData.flags;
    context.config = CONFIG.ROLEANDROLL || {};

    context.items = actorData.items || [];
    context.items.sort((a, b) => (a.sort || 0) - (b.sort || 0));

    context.skills = this._normalizeArray(actorData.system.skills);

    context.equipment = {
      left: [],
      right: [],
      bottomLeft: [],
      bottomRight: []
    };

    for (let item of context.items) {
      if (["weapon", "armor", "item"].includes(item.type)) {
        context.equipment.left.push(item);
      }
    }

    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    html.find(".attribute-roll").click(this._onAttributeRoll.bind(this));
    html.find(".ability-roll").click(this._onAbilityRoll.bind(this));
    html.find(".dice-control").click(this._onDiceControl.bind(this));

    html.find(".item-create").click(this._onItemCreate.bind(this));
    html.find(".item-delete").click(this._onItemDelete.bind(this));
    html.find(".item-edit").click(this._onItemEdit.bind(this));

    if (this.actor.isOwner) {
      const handler = ev => this._onDragStart(ev);
      html.find("li.item").each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }
  }

  async _onAttributeRoll(event) {
    event.preventDefault();
    const attr = event.currentTarget.dataset.attribute;
    if (attr) await this.actor.rollAttribute(attr);
  }

  async _onAbilityRoll(event) {
    event.preventDefault();
    const { category, ability } = event.currentTarget.dataset;
    if (category && ability) await this.actor.rollAbility(category, ability);
  }

  async _onDiceControl(event) {
    event.preventDefault();
    const { action, target } = event.currentTarget.dataset;
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

    await this.actor.update({ [`system.${target}`]: value });
  }

  async _onItemCreate(event) {
    event.preventDefault();
    event.stopPropagation();

    const type = event.currentTarget.dataset.type;

    if (type === "skill") {
      const skills = this._normalizeArray(foundry.utils.duplicate(this.actor.system.skills));

      skills.push({
        name: `New Skill ${skills.length + 1}`,
        description: ""
      });

      await this.actor.update({ "system.skills": skills });
      this.render(true);
      return;
    }

    const name = `New ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    const itemData = {
      name,
      type,
      system: {}
    };

    await Item.create(itemData, { parent: this.actor });
    this.render(true);
  }

  async _onItemDelete(event) {
    event.preventDefault();
    event.stopPropagation();

    const skillIndex = event.currentTarget.dataset.index;

    if (skillIndex !== undefined) {
      const skills = this._normalizeArray(foundry.utils.duplicate(this.actor.system.skills));

      skills.splice(Number(skillIndex), 1);

      await this.actor.update({ "system.skills": skills });
      this.render(true);
      return;
    }

    const li = event.currentTarget.closest(".item");
    const item = this.actor.items.get(li?.dataset?.itemId);
    if (!item) return;

    await item.delete();
    this.render(true);
  }

  async _onItemEdit(event) {
    event.preventDefault();

    const li = event.currentTarget.closest(".item");
    const item = this.actor.items.get(li?.dataset?.itemId);
    if (item) item.sheet.render(true);
  }
}
