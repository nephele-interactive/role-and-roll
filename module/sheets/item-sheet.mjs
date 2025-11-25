// module/sheets/item-sheet.mjs

export class RoleAndRollItemSheet extends ItemSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["role-and-roll", "sheet", "item"],
      template: "systems/role-and-roll/templates/item/item-sheet.hbs",
      width: 520,
      height: 480,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
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

    // Roll item dice if applicable
    html.find('.item-roll').click(this._onRoll.bind(this));
  }

  async _onRoll(event) {
    event.preventDefault();
    await this.item.roll();
  }
}