// module/session-abilities-config.mjs

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export class SessionAbilitiesConfig extends HandlebarsApplicationMixin(ApplicationV2) {

  static DEFAULT_OPTIONS = {
    id: "session-abilities-config",
    classes: ["role-and-roll"],
    position: { width: 800 },
    window: {
      title: "Configure Session Abilities",
      resizable: true
    },
    tag: "form",
    form: {
      handler: SessionAbilitiesConfig.#onSubmitForm,
      submitOnChange: false,
      closeOnSubmit: true
    },
    actions: {
      addAbility: SessionAbilitiesConfig.#onAddAbility,
      deleteAbility: SessionAbilitiesConfig.#onDeleteAbility,
      toggleDropdown: SessionAbilitiesConfig.#onToggleDropdown
    }
  };

  static PARTS = {
    config: {
      template: "systems/role-and-roll/templates/session-abilities-config.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const abilities = game.settings.get("role-and-roll", "customSessionAbilities") || {};

    context.abilities = Object.entries(abilities).map(([key, config]) => ({
      key,
      name: config.name,
      baseAbilities: config.baseAbilities || [],
      mode: config.mode
    }));
    context.allOptions = this._getAllAbilitiesAndAttributes();
    context.modes = {
      single: "Single",
      dual: "Dual",
      select: "Select"
    };

    return context;
  }

  _getAllAbilitiesAndAttributes() {
    const items = [];

    // Add attributes
    const attributes = ["strength", "dexterity", "toughness", "intellect", "aptitude", "sanity", "charm", "rhetoric", "ego"];
    attributes.forEach(attr => {
      items.push({
        value: attr,
        label: game.i18n.localize(`ROLEANDROLL.Attributes.${attr}`),
        type: "attribute"
      });
    });

    // Add abilities
    const abilities = {
      academic: ["generalEducation", "search", "history", "art", "medicine", "herb", "firstAid", "law", "electronic", "mechanical", "craft"],
      intuition: ["occult", "perception", "hideSneak", "persuade", "consider", "empathy", "bet", "senseOfLie", "intimidate", "survival"],
      physical: ["climb", "stealth", "break", "weapons", "swordPlay", "throwing", "shootingWeapons", "reflex", "larcency", "athlete"]
    };

    for (const category in abilities) {
      abilities[category].forEach(ability => {
        items.push({
          value: ability,
          label: game.i18n.localize(`ROLEANDROLL.Abilities.${ability}`),
          type: "ability"
        });
      });
    }

    return items;
  }

  _onRender(context, options) {
    super._onRender(context, options);

    // Key input validation - lowercase only, English characters only
    this.element.querySelectorAll(".ability-key").forEach(input => {
      input.addEventListener("input", (e) => {
        let value = e.currentTarget.value;
        value = value.toLowerCase();
        value = value.replace(/[^a-z0-9_-]/g, '');
        if (e.currentTarget.value !== value) {
          e.currentTarget.value = value;
        }
      });
    });

    // Option selection
    this.element.querySelectorAll(".base-ability-option").forEach(opt => {
      opt.addEventListener("click", this._onToggleBaseAbility.bind(this));
    });

    // Remove tag
    this.element.querySelectorAll(".remove-selected").forEach(btn => {
      btn.addEventListener("click", this._onRemoveSelected.bind(this));
    });

    // Mode change
    this.element.querySelectorAll(".ability-mode").forEach(select => {
      select.addEventListener("change", this._onModeChange.bind(this));
    });

    // Close dropdowns when clicking outside
    this._onDocumentClick = (e) => {
      if (!e.target.closest(".multi-select-wrapper")) {
        this.element.querySelectorAll(".dropdown-options").forEach(dd => {
          dd.style.display = "none";
        });
      }
    };
    document.addEventListener("click", this._onDocumentClick);
  }

  _onClose(options) {
    // Clean up document-level event listeners
    if (this._onDocumentClick) {
      document.removeEventListener("click", this._onDocumentClick);
    }
    return super._onClose(options);
  }

  static #onAddAbility(event, target) {
    event.preventDefault();
    const allOptions = this._getAllAbilitiesAndAttributes();

    const optionsHtml = allOptions.map(opt =>
      `<div class="base-ability-option" data-value="${opt.value}">${opt.label}</div>`
    ).join('');

    const abilityList = this.element.querySelector(".ability-list");
    abilityList.insertAdjacentHTML('beforeend', `
      <div class="ability-row">
        <input type="text" class="ability-key" placeholder="computer" />
        <input type="text" class="ability-name" placeholder="Computer" />
        <div class="multi-select-wrapper">
          <div class="selected-items"></div>
          <div class="dropdown-toggle" data-action="toggleDropdown">
            <span class="placeholder">Select...</span>
            <i class="fas fa-chevron-down"></i>
          </div>
          <div class="dropdown-options" style="display: none;">
            ${optionsHtml}
          </div>
        </div>
        <select class="ability-mode">
          <option value="single">Single</option>
          <option value="dual">Dual</option>
          <option value="select">Select</option>
        </select>
        <button type="button" class="delete-ability" data-action="deleteAbility"><i class="fas fa-trash"></i></button>
      </div>
    `);

    // Reattach listeners for new elements
    const newRow = abilityList.lastElementChild;
    newRow.querySelector(".ability-key").addEventListener("input", (e) => {
      let value = e.currentTarget.value;
      value = value.toLowerCase();
      value = value.replace(/[^a-z0-9_-]/g, '');
      if (e.currentTarget.value !== value) {
        e.currentTarget.value = value;
      }
    });
    newRow.querySelectorAll(".base-ability-option").forEach(opt => {
      opt.addEventListener("click", this._onToggleBaseAbility.bind(this));
    });
    newRow.querySelector(".ability-mode").addEventListener("change", this._onModeChange.bind(this));
  }

  static #onDeleteAbility(event, target) {
    event.preventDefault();
    const row = target.closest(".ability-row");
    if (row) row.remove();
  }

  static #onToggleDropdown(event, target) {
    event.stopPropagation();
    const dropdown = target.closest(".multi-select-wrapper").querySelector(".dropdown-options");

    // Close all other dropdowns
    this.element.querySelectorAll(".dropdown-options").forEach(dd => {
      if (dd !== dropdown) dd.style.display = "none";
    });

    // Toggle this dropdown
    dropdown.style.display = dropdown.style.display === "none" ? "block" : "none";
  }

  _onModeChange(event) {
    const row = event.currentTarget.closest(".ability-row");
    const mode = event.currentTarget.value;
    const selectedTags = row.querySelectorAll(".selected-items .selected-tag");

    if (mode === "single" && selectedTags.length > 1) {
      ui.notifications.warn("Single mode only allows 1 base ability. Please remove extras.");
    }
  }

  _onToggleBaseAbility(event) {
    const option = event.currentTarget;
    const row = option.closest(".ability-row");
    const mode = row.querySelector(".ability-mode").value;
    const value = option.dataset.value;
    const label = option.textContent;

    const selectedContainer = row.querySelector(".selected-items");
    const currentCount = selectedContainer.querySelectorAll(".selected-tag").length;

    // Check if already selected
    const existing = selectedContainer.querySelector(`.selected-tag[data-value="${value}"]`);

    if (existing) {
      // Remove it
      existing.remove();
      option.classList.remove("selected");
    } else {
      // Add it (but check single mode limit)
      if (mode === "single" && currentCount >= 1) {
        ui.notifications.warn("Single mode only allows 1 base ability. Remove the current one first.");
        return;
      }

      const tag = document.createElement("span");
      tag.className = "selected-tag";
      tag.dataset.value = value;
      tag.innerHTML = `${label}<i class="fas fa-times remove-selected"></i>`;
      selectedContainer.appendChild(tag);

      // Attach remove listener
      tag.querySelector(".remove-selected").addEventListener("click", this._onRemoveSelected.bind(this));

      option.classList.add("selected");
    }

    // Close dropdown
    row.querySelector(".dropdown-options").style.display = "none";
  }

  _onRemoveSelected(event) {
    event.stopPropagation();
    const tag = event.currentTarget.closest(".selected-tag");
    const value = tag.dataset.value;
    const row = tag.closest(".ability-row");

    tag.remove();
    const option = row.querySelector(`.base-ability-option[data-value="${value}"]`);
    if (option) option.classList.remove("selected");
  }

  static async #onSubmitForm(event, form, formData) {
    const abilities = {};
    const rows = this.element.querySelectorAll(".ability-row");

    rows.forEach((row) => {
      const key = row.querySelector(".ability-key").value.trim();
      const name = row.querySelector(".ability-name").value.trim();
      const mode = row.querySelector(".ability-mode").value;

      const bases = [];
      row.querySelectorAll(".selected-tag").forEach(tag => {
        bases.push(tag.dataset.value);
      });

      if (key && name && bases.length > 0) {
        abilities[key] = {
          name: name,
          baseAbilities: bases,
          mode: mode
        };
      }
    });

    await game.settings.set("role-and-roll", "customSessionAbilities", abilities);
    ui.notifications.info("Session Abilities configuration saved!");

    // Re-render all actor sheets to show new abilities
    foundry.applications.instances.forEach(app => {
      if (app.constructor.name === "RoleAndRollActorSheet") app.render();
    });
  }
}
