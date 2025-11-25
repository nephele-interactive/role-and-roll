# Role & Roll Game System for FoundryVTT

A complete game system implementation for the Role & Roll TRPG using d6 dice pool mechanics.

## Features

- **Character Sheet**: Full implementation matching the Role & Roll character sheet design
- **Dice Pool System**: Roll multiple d6 dice where:
  - Rolling a 1 = +1 success
  - Rolling a 6 = +1 success + roll one additional die (critical success)
- **Dice So Nice Integration**: Dice roll one-by-one for dramatic effect
- **Attributes System**: 9 attributes across Body, Intelligence & Emotion, and Personality
- **Abilities System**: Academic, Intuition/Training, and Physical skills
- **Skills & Equipment**: Full inventory and skill management

## Installation

### Dice So Nice Configuration

The system automatically works with Dice So Nice if installed. Dice will roll sequentially (one-by-one) for dramatic effect.

To install Dice So Nice:
1. In FoundryVTT, go to Add-on Modules
2. Search for "Dice So Nice"
3. Install and enable it
4. The Role & Roll system will automatically use it

## Usage

### Rolling Dice

**Attributes**: Click the roll button next to any attribute to roll its dice pool.

**Abilities**: Click the roll button next to any ability to roll its dice pool.

**Skills**: Click the dice icon next to any skill to roll.

### Dice Mechanics

- Each die that shows **1** counts as **1 success**
- Each die that shows **6** counts as **1 success** AND triggers a bonus die roll
- Bonus dice from 6s follow the same rules (1 or 6 = success, 6 = another bonus die)
- Success count is displayed in the chat

### Managing Dice Pools

- Use **+** and **-** buttons to adjust the number of dice in each pool (0-6 dice)
- Check the **Succeed** checkbox

### Character Creation

1. Create a new Actor (type: Character)
2. Set Health, Mental, Level, WP, and Defense values
3. Allocate dice to Attributes 
4. Allocate dice to Abilities 
5. Add Skills and Equipment as needed

## System Details

### Attributes 

**Body**:
- Strength
- Dexterity
- Toughness

**Intelligence & Emotion**:
- Intellect
- Aptitude
- Sanity

**Personality**:
- Charm
- Rhetoric
- Ego

### Abilities 

**Academic**: General Education, Search, History, Art, Medicine, Herb, First Aid, Law, Electronic, Mechanical, Craft

**Intuition and Training**: Occult, Perception, Hide & Sneak, Persuade, Consider, Empathy, Bet, Sense of Lie, Intimidate, Survival

**Physical Skills**: Climb, Stealth, Break, Weapons, Sword Play, Throwing, Shooting Weapons, Reflex, Agility, Athlete

## Credits

- **Gameplay**: bgn squad & Arm Epic
- **System Author**: Nephele Interactive
- **Game System**: Role & Roll (d6 dice pool)
- **FoundryVTT Version**: Compatible with v12+

## License

This system is provided as-is for use with FoundryVTT. Please ensure you have appropriate rights to use the Role & Roll game system.

## Support

For issues or questions about this system implementation, please join bgn squad discord https://discord.gg/RNjEeQvWeb

---

**Note**: Make sure all file paths in the code match your actual folder structure. The system expects files to be in the exact locations specified in the folder structure above.