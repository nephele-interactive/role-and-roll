# Role & Roll Game System for FoundryVTT

A complete game system implementation for the Role & Roll TRPG using d6 dice pool mechanics.

---

## Features

- **Character Sheet**: Full implementation matching the Role & Roll character sheet design
- **Dice Pool System**: Roll multiple d6 dice where:
  - Rolling a 1 = +1 success
  - Rolling a 6 = +1 success + roll one additional die (critical success)
- **Dice So Nice Integration**: Dice roll one-by-one for dramatic effect
- **Attributes System**: 9 attributes across Body, Intelligence & Emotion, and Personality
- **Abilities System**: Academic, Intuition/Training, and Physical skills
- **Skills & Equipment**: Full inventory and skill management

---

## Installation

### Method 1: Install via Foundry Package Manager (Recommended)

1. Open **Foundry VTT**
2. Click **Game Systems**
3. Click **Install System**
4. Paste this Manifest URL:
```https://raw.githubusercontent.com/nephele-interactive/role-and-roll/main/system.json```
5. Click **Install**
6. Create a new world and select **Role & Roll** as the system

---

### Method 2: Manual GitHub Installation

1. Download ZIP from GitHub:
```https://github.com/nephele-interactive/role-and-roll/archive/refs/heads/main.zip```
2. Extract the folder
3. Rename the folder to:
```role-and-roll```
4. Move it into your Foundry systems folder:

**Windows**
```C:\Users<YourName>\AppData\Local\FoundryVTT\Data\systems\role-and-roll```
**Linux**
```/home/foundry/.local/share/FoundryVTT/Data/systems/role-and-roll```

---

## Dice So Nice Configuration

The system automatically works with Dice So Nice if installed.

To install Dice So Nice:

1. Go to **Add-on Modules**
2. Search for: `Dice So Nice`
3. Install and enable it

---

## Usage

### Rolling Dice

- Click 🎲 next to **Attributes** to roll
- Click 🎲 next to **Abilities** to roll
- Click 🎲 next to **Skills** to roll

---

### Dice Mechanics

- **1** = 1 success
- **6** = 1 success + bonus die
- Bonus dice can also explode on 6

---

## Character Creation

1. Create a new **Actor**
2. Type: `Character`
3. Fill Health, Mental, Level, WP, Defense
4. Assign dice
5. Add gear and skills

---

## System Details

### Attributes

**Body**  
Strength, Dexterity, Toughness

**Intelligence & Emotion**  
Intellect, Aptitude, Sanity

**Personality**  
Charm, Rhetoric, Ego

---

### Abilities

**Academic**  
General Education, Search, History, Art, Medicine, Herb, First Aid, Law, Electronic, Mechanical, Craft  

**Intuition & Training**  
Occult, Perception, Hide & Sneak, Persuade, Consider, Empathy, Bet, Sense of Lie, Intimidate, Survival  

**Physical**  
Climb, Stealth, Break, Weapons, Sword Play, Throwing, Shooting Weapons, Reflex, Agility, Athlete  

---

## Credits

- Gameplay: **bgn squad & Arm Epic**
- System Dev: **Nephele Interactive**
- System Name: **Role & Roll**
- Platform: **Foundry VTT**

---

## License

You may **run free or paid sessions** using this system.

You may **NOT sell, redistribute, or repackage** the system itself.

See `LICENSE.txt` for full terms.

---

## Support

GitHub:  
https://github.com/nephele-interactive/role-and-roll

## BGN Squad Discord:  
https://discord.gg/RNjEeQvWeb
