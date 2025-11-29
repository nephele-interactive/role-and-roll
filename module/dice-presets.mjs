/**
 * Dice Presets for Role & Roll
 * Pre-register all possible face combinations for 3D dice
 * 
 * Face positions:
 * 1: Always ● (dot)
 * 2-5: Can be blank, +, or -
 * 6: Always R (reroll)
 * 
 * Naming convention: 4-character code for faces 2-5
 * b = blank
 * p = plus (+)
 * m = minus (-)
 * 
 * Example: "bpmb" means:
 * - Face 2: b (blank)
 * - Face 3: p (plus +)
 * - Face 4: m (minus -)
 * - Face 5: b (blank)
 */

/**
 * Generate all possible dice presets (3^4 = 81 combinations)
 */
export function generateAllDicePresets() {
    const presets = [];
    const faceTypes = ['b', 'p', 'm']; // blank, plus, minus

    // Generate all combinations for faces 2-5
    for (const f2 of faceTypes) {
        for (const f3 of faceTypes) {
            for (const f4 of faceTypes) {
                for (const f5 of faceTypes) {
                    const code = `${f2}${f3}${f4}${f5}`;
                    const systemId = `rnr-${code}`;

                    // Dice So Nice expects labels array where:
                    // labels[0] = face 1, labels[1] = face 2, etc.
                    const labels = [
                        '',
                        '',
                        '●',                    // Face 1: always dot
                        faceTypeToLabel(f2),    // Face 2
                        faceTypeToLabel(f3),    // Face 3
                        faceTypeToLabel(f4),    // Face 4
                        faceTypeToLabel(f5),    // Face 5
                        'R'                     // Face 6: always R
                    ];

                    presets.push({ code, systemId, labels });
                }
            }
        }
    }

    console.log(`Role & Roll | Generated ${presets.length} dice presets`);
    return presets;
}

/**
 * Helper to convert face type code to label
 * Using full-width characters for better visibility on 3D dice
 */
function faceTypeToLabel(type) {
    switch (type) {
        case 'b': return '　'; // Full-width space for blank faces
        case 'p': return '＋'; // Full-width plus
        case 'm': return '－'; // Full-width minus
        default: return '　';
    }
}

/**
 * Convert modifier configuration to preset code
 * @param {Object} modifierPositions - Object with keys 2-5 mapping to 'blank'/'plus'/'minus'
 * @returns {string} 4-character code like "bbbb", "mpbb", etc.
 */
export function modifierToPresetCode(modifierPositions) {
    const f2 = modifierTypeToCode(modifierPositions[2] || 'blank');
    const f3 = modifierTypeToCode(modifierPositions[3] || 'blank');
    const f4 = modifierTypeToCode(modifierPositions[4] || 'blank');
    const f5 = modifierTypeToCode(modifierPositions[5] || 'blank');
    return `${f2}${f3}${f4}${f5}`;
}

/**
 * Helper to convert modifier type to code
 */
function modifierTypeToCode(modType) {
    switch (modType) {
        case 'blank': return 'b';
        case 'plus': return 'p';
        case 'minus': return 'm';
        default: return 'b';
    }
}

/**
 * Get system ID from preset code
 * @param {string} code - 4-character code like "bbbb"
 * @returns {string} System ID like "rnr-bbbb"
 */
export function getSystemIdFromCode(code) {
    return `rnr-${code}`;
}

/**
 * Check if a modifier configuration is "default" (all blanks)
 * @param {Object} modifierPositions - Object with keys 2-5
 * @returns {boolean} True if all positions are blank
 */
export function isDefaultModifier(modifierPositions) {
    return (
        (!modifierPositions[2] || modifierPositions[2] === 'blank') &&
        (!modifierPositions[3] || modifierPositions[3] === 'blank') &&
        (!modifierPositions[4] || modifierPositions[4] === 'blank') &&
        (!modifierPositions[5] || modifierPositions[5] === 'blank')
    );
}

/**
 * Register all presets with Dice So Nice
 * Uses dual system: default for unmodified dice, custom presets for modified dice
 */
export function registerAllPresets(dice3d) {
    console.log("Role & Roll | Registering dice presets...");

    let totalRegistered = 0;

    // ========================================================================
    // 1. Register DEFAULT system (no modifiers - all blank faces)
    // ========================================================================
    try {
        dice3d.addSystem({
            id: "role-and-roll-default",
            name: "Role & Roll (Default)"
        }, "preferred");

        dice3d.addDicePreset({
            type: "d6",
            labels: ['●', '　', '　', '　', '　', 'R'],
            system: "role-and-roll-default"
        }, "d6");

        console.log("Role & Roll | ✓ Registered default dice system");
        totalRegistered++;
    } catch (e) {
        console.warn("Role & Roll | ✗ Error registering default preset:", e);
    }

    // ========================================================================
    // 2. Register all MODIFIER presets (80 combinations, excluding all-blank)
    // ========================================================================
    const presets = generateAllDicePresets();
    let modifierCount = 0;

    for (const preset of presets) {
        // Skip the all-blank preset since we handle it as default above
        if (preset.code === 'bbbb') {
            console.log(`Role & Roll | Skipping ${preset.code} (handled by default system)`);
            continue;
        }

        try {
            // Register the system
            dice3d.addSystem({
                id: preset.systemId,
                name: `R&R (${preset.code})`
            }, "preferred");

            // Register the dice preset
            dice3d.addDicePreset({
                type: "d6",
                labels: preset.labels,
                system: preset.systemId
            }, "d6");

            modifierCount++;
        } catch (e) {
            console.warn(`Role & Roll | ✗ Error registering preset ${preset.code}:`, e);
        }
    }

    totalRegistered += modifierCount;

    console.log(`Role & Roll | ✓ Registered ${modifierCount} modifier presets`);
    console.log(`Role & Roll | Total: ${totalRegistered} dice systems registered`);

    return totalRegistered;
}