// module/dice-control-dialog.mjs

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export class DiceControlDialog extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor({numDice, label, autoSuccess, actor, ...options} = {}) {
        super(options);
        this.numDice = numDice;
        this.label = label;
        this.autoSuccess = autoSuccess;
        this.actor = actor;
    }

    static DEFAULT_OPTIONS = {
        classes: ["role-and-roll", "dice-control-dialog"],
        position: { width: 700 },
        window: {
            title: "R&R Dice Control",
            resizable: true
        },
        tag: "form",
        form: {
            handler: DiceControlDialog.#onSubmitForm,
            submitOnChange: false,
            closeOnSubmit: false
        },
        actions: {
            cancel: DiceControlDialog.#onCancel
        }
    };

    static PARTS = {
        dialog: {
            template: "systems/role-and-roll/templates/dice-control-dialog.hbs"
        }
    };

    async _prepareContext(options) {
        const context = await super._prepareContext(options);

        // Get will power from actor (wp field)
        context.currentWillPower = this.actor?.system?.wp?.value || 0;

        // Format the help text with the current will power value
        context.willPowerHelpText = game.i18n.format("ROLEANDROLL.DiceControl.WillPowerHelp", {
            current: context.currentWillPower
        });

        context.numDice = this.numDice;
        context.label = this.label;

        // Create dice rows (6 dice per row)
        const dicePerRow = 6;
        const rows = [];
        for (let i = 0; i < this.numDice; i += dicePerRow) {
            const rowDice = [];
            for (let j = 0; j < dicePerRow && (i + j) < this.numDice; j++) {
                rowDice.push({
                    dieIndex: i + j,
                    positions: [2, 3, 4, 5] // Face positions that can be modified
                });
            }
            rows.push(rowDice);
        }
        context.diceRows = rows;

        return context;
    }

    async _onClose(options) {
        // If the dialog is being closed and there's a reject callback (from initiative),
        // and we haven't resolved yet, reject the promise
        if (this._rejectCallback && !this._resolved) {
            this._rejectCallback(new Error("Dialog was cancelled"));
        }
        return super._onClose(options);
    }

    static #onCancel(event, target) {
        event.preventDefault();
        this.close();
    }

    static async #onSubmitForm(event, form, formData) {
        console.log("Dice Control Dialog - form submitted", formData);

        const data = formData.object;

        // Parse will power
        const willPower = parseInt(data.willPower) || 0;

        // Validate will power
        const currentWP = this.actor?.system?.wp?.value || 0;
        if (willPower > currentWP) {
            const msg = game.i18n.format("ROLEANDROLL.Notifications.NotEnoughWillPower", { current: currentWP, tried: willPower });
            ui.notifications.warn(msg);
            return;
        }

        // Parse modifier configuration from form data
        const modifiers = [];
        for (let i = 0; i < this.numDice; i++) {
            const dieModifiers = {
                positions: {
                    2: 'blank',
                    3: 'blank',
                    4: 'blank',
                    5: 'blank'
                }
            };

            // Check each position for this die
            for (let pos = 2; pos <= 5; pos++) {
                const fieldName = `dice${i}.pos${pos}`;
                if (data[fieldName]) {
                    dieModifiers.positions[pos] = data[fieldName];
                }
            }

            modifiers.push(dieModifiers);
        }

        console.log("Calling rollDicePool with:", { numDice: this.numDice, label: this.label, autoSuccess: this.autoSuccess, willPower, modifiers });

        // Mark as resolved before closing
        this._resolved = true;

        // Close dialog immediately
        this.close();

        // Call the roll function and capture result
        const result = await game.roleandroll.rollDicePool(
            this.numDice,
            this.label,
            this.autoSuccess,
            this.actor,
            willPower,
            modifiers
        );

        // If a resolve callback was provided (for initiative), call it with the result
        if (this._resolveCallback) {
            this._resolveCallback(result);
        }
    }
}
