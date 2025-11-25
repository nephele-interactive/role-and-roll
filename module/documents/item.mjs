// module/documents/item.mjs

export class RoleAndRollItem extends Item {

  prepareData() {
    super.prepareData();
    const system = this.system;

    system.description ??= "";
    system.dice ??= 0;
  }

  async roll() {
    const dice = Number(this.system.dice) || 1;
    const label = `${this.name}`;

    return await game.roleandroll.rollDicePool(dice, label);
  }
}
