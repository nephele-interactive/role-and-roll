export class SessionAbilitiesConfig extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Configure Session Abilities",
      id: "session-abilities-config",
      template: "systems/role-and-roll/templates/session-abilities-config.hbs",
      width: 800,
      height: "auto",
      closeOnSubmit: true,
      submitOnClose: false,
      submitOnChange: false
    });
  }

  getData() {
    const abilities = game.settings.get("role-and-roll", "customSessionAbilities") || {};
    
    return {
      abilities: Object.entries(abilities).map(([key, config]) => ({
        key,
        name: config.name,
        baseAbilities: config.baseAbilities || [],
        mode: config.mode
      })),
      allOptions: this._getAllAbilitiesAndAttributes(),
      modes: {
        single: "Single",
        dual: "Dual",
        select: "Select"
      }
    };
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

  activateListeners(html) {
    super.activateListeners(html);
    
    html.find(".add-ability").click(this._onAddAbility.bind(this));
    html.find(".delete-ability").click(this._onDeleteAbility.bind(this));
    html.find(".ability-mode").change(this._onModeChange.bind(this));
    
    // Attach dropdown and tag listeners
    this._attachDropdownListeners(html);
  }

  _attachDropdownListeners(html) {
    // Key input validation - lowercase only, English characters only
    html.find(".ability-key").off("input").on("input", (e) => {
      const input = e.currentTarget;
      let value = input.value;
      
      // Convert to lowercase
      value = value.toLowerCase();
      
      // Remove non-English characters (only allow a-z, 0-9, underscore, hyphen)
      value = value.replace(/[^a-z0-9_-]/g, '');
      
      // Update if changed
      if (input.value !== value) {
        input.value = value;
      }
    });
    
    // Dropdown toggle
    html.find(".dropdown-toggle").off("click").on("click", (e) => {
      e.stopPropagation();
      const $dropdown = $(e.currentTarget).siblings(".dropdown-options");
      
      // Close all other dropdowns
      html.find(".dropdown-options").not($dropdown).hide();
      
      // Toggle this dropdown
      $dropdown.toggle();
    });
    
    // Option selection
    html.find(".base-ability-option").off("click").on("click", this._onToggleBaseAbility.bind(this));
    
    // Remove tag
    html.find(".remove-selected").off("click").on("click", this._onRemoveSelected.bind(this));
    
    // Close dropdowns when clicking outside
    $(document).off("click.session-abilities").on("click.session-abilities", (e) => {
      if (!$(e.target).closest(".multi-select-wrapper").length) {
        html.find(".dropdown-options").hide();
      }
    });
  }

  _onAddAbility(event) {
    event.preventDefault();
    const html = this.element;
    const allOptions = this._getAllAbilitiesAndAttributes();
    
    const optionsHtml = allOptions.map(opt => 
      `<div class="base-ability-option" data-value="${opt.value}">${opt.label}</div>`
    ).join('');
    
    html.find(".ability-list").append(`
      <div class="ability-row">
        <input type="text" class="ability-key" placeholder="computer" />
        <input type="text" class="ability-name" placeholder="Computer" />
        <div class="multi-select-wrapper">
          <div class="selected-items"></div>
          <div class="dropdown-toggle" data-action="toggle-dropdown">
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
        <button type="button" class="delete-ability"><i class="fas fa-trash"></i></button>
      </div>
    `);
    
    // Reattach listeners for new row
    this._attachDropdownListeners(html);
  }

  _onDeleteAbility(event) {
    event.preventDefault();
    $(event.currentTarget).closest(".ability-row").remove();
  }

  _onModeChange(event) {
    const $row = $(event.currentTarget).closest(".ability-row");
    const mode = $(event.currentTarget).val();
    const $selected = $row.find(".selected-items .selected-tag");
    
    // If mode is "single" and more than 1 is selected, show warning
    if (mode === "single" && $selected.length > 1) {
      ui.notifications.warn("Single mode only allows 1 base ability. Please remove extras.");
    }
  }

  _onToggleBaseAbility(event) {
    const $option = $(event.currentTarget);
    const $row = $option.closest(".ability-row");
    const mode = $row.find(".ability-mode").val();
    const value = $option.data("value");
    const label = $option.text();
    
    const $selectedContainer = $row.find(".selected-items");
    const currentCount = $selectedContainer.find(".selected-tag").length;
    
    // Check if already selected
    const alreadySelected = $selectedContainer.find(`.selected-tag[data-value="${value}"]`).length > 0;
    
    if (alreadySelected) {
      // Remove it
      $selectedContainer.find(`.selected-tag[data-value="${value}"]`).remove();
      $option.removeClass("selected");
    } else {
      // Add it (but check single mode limit)
      if (mode === "single" && currentCount >= 1) {
        ui.notifications.warn("Single mode only allows 1 base ability. Remove the current one first.");
        return;
      }
      
      $selectedContainer.append(`
        <span class="selected-tag" data-value="${value}">
          ${label}
          <i class="fas fa-times remove-selected"></i>
        </span>
      `);
      $option.addClass("selected");
    }
    
    // Close dropdown
    $row.find(".dropdown-options").hide();
    
    // Reattach listeners after DOM change
    this._attachDropdownListeners($(this.element));
  }

  _onRemoveSelected(event) {
    event.stopPropagation();
    const $tag = $(event.currentTarget).closest(".selected-tag");
    const value = $tag.data("value");
    const $row = $tag.closest(".ability-row");
    
    $tag.remove();
    $row.find(`.base-ability-option[data-value="${value}"]`).removeClass("selected");
  }

  async _updateObject(event, formData) {
    const abilities = {};
    const rows = this.element.find(".ability-row");
    
    rows.each((i, row) => {
      const $row = $(row);
      const key = $row.find(".ability-key").val().trim();
      const name = $row.find(".ability-name").val().trim();
      const mode = $row.find(".ability-mode").val();
      
      const bases = [];
      $row.find(".selected-tag").each((j, tag) => {
        bases.push($(tag).data("value"));
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
    Object.values(ui.windows).forEach(app => {
      if (app.constructor.name === "RoleAndRollActorSheet") app.render();
    });
  }

  close(options) {
    // Clean up document-level event listeners
    $(document).off("click.session-abilities");
    return super.close(options);
  }
}
