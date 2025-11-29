// module/dice-control-dialog.mjs

export class DiceControlDialog extends FormApplication {
    constructor(numDice, label, autoSuccess, actor, options = {}) {
        super({}, options);
        this.numDice = numDice;
        this.label = label;
        this.autoSuccess = autoSuccess;
        this.actor = actor;
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["role-and-roll", "dice-control-dialog"],
            template: "systems/role-and-roll/templates/dice-control-dialog.hbs",
            width: 700,
            height: "auto",
            title: "R&R Dice Control",
            closeOnSubmit: false,
            submitOnChange: false
        });
    }

    getData() {
        const context = super.getData();

        // Get will power from actor (wp field)
        context.currentWillPower = this.actor?.system?.wp || 0;

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

    activateListeners(html) {
        super.activateListeners(html);

        html.find('.cancel-btn').click(ev => {
            ev.preventDefault();
            this.close();
        });
    }

    async close(options = {}) {
        // If the dialog is being closed and there's a reject callback (from initiative),
        // and we haven't resolved yet, reject the promise
        if (this._rejectCallback && !this._resolved) {
            this._rejectCallback(new Error("Dialog was cancelled"));
        }
        return super.close(options);
    }


    async _updateObject(event, formData) {
        console.log("Dice Control Dialog - _updateObject called", formData);

        // Parse will power
        const willPower = parseInt(formData.willPower) || 0;

        // Validate will power
        const currentWP = this.actor?.system?.wp || 0;
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
                if (formData[fieldName]) {
                    dieModifiers.positions[pos] = formData[fieldName];
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

