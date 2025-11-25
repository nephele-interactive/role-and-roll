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

    html.find(".item-create").click(ev => this._onItemCreate(ev));
    html.find(".item-delete").click(ev => this._onItemDelete(ev));
    html.find(".item-edit").click(ev => this._onItemEdit(ev));
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
    const type = event.currentTarget.dataset.type;

    if (type === "skill") {
      const skills = Array.isArray(this.actor.system.skills)
        ? foundry.utils.duplicate(this.actor.system.skills)
        : [];

      skills.push({
        name: `Skill ${skills.length + 1}`,
        dice: 1
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
}
