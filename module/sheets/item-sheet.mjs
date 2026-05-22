// module/sheets/item-sheet.mjs

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class RoleAndRollItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["role-and-roll", "sheet", "item"],
    position: { width: 520, height: 480 },
    window: { resizable: true },
    tag: "form",
    form: {
      submitOnChange: true,
      closeOnSubmit: false
    },
    actions: {
      itemRoll: RoleAndRollItemSheet.#onRoll
    }
  };

  static PARTS = {
    sheet: {
      template: "systems/role-and-roll/templates/item/item-sheet.hbs",
      scrollable: [".sheet-body"]
    }
  };

  tabGroups = {
    primary: "description"
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const itemData = this.document.toObject(false);

    context.item = this.document;
    context.system = itemData.system;
    context.flags = itemData.flags;
    context.editable = this.isEditable;

    return context;
  }

  _onRender(context, options) {
    super._onRender(context, options);

    // Tab management
    const group = "primary";
    const activeTab = this.tabGroups[group] || "description";
    const nav = this.element.querySelector('.sheet-tabs[data-group="primary"]');
    const body = this.element.querySelector('.sheet-body');
    if (!nav || !body) return;

    nav.querySelectorAll(".item[data-tab]").forEach(tab => {
      tab.classList.toggle("active", tab.dataset.tab === activeTab);
    });
    body.querySelectorAll(".tab[data-tab]").forEach(panel => {
      panel.classList.toggle("active", panel.dataset.tab === activeTab);
    });
    nav.querySelectorAll(".item[data-tab]").forEach(tab => {
      tab.addEventListener("click", (ev) => {
        ev.preventDefault();
        const tabName = ev.currentTarget.dataset.tab;
        this.tabGroups[group] = tabName;
        nav.querySelectorAll(".item[data-tab]").forEach(t => t.classList.toggle("active", t.dataset.tab === tabName));
        body.querySelectorAll(".tab[data-tab]").forEach(p => p.classList.toggle("active", p.dataset.tab === tabName));
      });
    });
  }

  static async #onRoll(event, target) {
    event.preventDefault();
    await this.document.roll();
  }
}
