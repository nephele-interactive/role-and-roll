// module/sheets/item-sheet.mjs

export class RoleAndRollItemSheet extends ItemSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["role-and-roll", "sheet", "item"],
      template: "systems/role-and-roll/templates/item/item-sheet.hbs",
      width: 520,
      height: 480
    });
  }

  getData() {
    const context = super.getData();
    const itemData = this.item.toObject(false);

    context.system = itemData.system;
    context.flags = itemData.flags;

    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    html.find(".item-roll").click(ev => this._onRoll(ev));
  }

  async _onRoll(event) {
    event.preventDefault();
    await this.item.roll();
  }
}
