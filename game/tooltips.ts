// Tooltip descriptions for game mechanics

export const BLOODLINE_TOOLTIPS: Record<string, string> = {
  'Desert Wind': 'Excels on dry and sandy tracks. Gains +1 Speed on dry surfaces with 2+ horses, and ignores heat/sand penalties with 3+ horses.',
  'Northern Storm': 'Built for endurance and harsh weather. Gains +1 Grit with 2+ horses and +1 Stamina with 3+ horses of this bloodline.',
  'Iron Heart': 'Maximum stamina specialists. Gains +1 Stamina with 2+ horses and +2 Stamina with 3+ horses of this bloodline.',
  'Wild Card': 'Unpredictable but exciting. Gets favorable variance with 2+ horses and can reroll bad Temper with 3+ horses.',
  'Mudblood': 'Masters of wet conditions. Gains +2 Grit on wet/muddy tracks with 2+ horses and bonus Speed in mud with 3+ horses.',
  'Royal Line': 'Elite bloodline that enhances your best horse. Grants +1 to all stats of your highest tier horse with 2+ horses.',
}

export const JOCKEY_TRAIT_TOOLTIPS: Record<string, string> = {
  'Mudder': 'Specialist in wet conditions. Gains +2 Grit when racing on wet or muddy tracks.',
  'Closer': 'Excels at comebacks. Gains +15% Speed in the final stretch when positioned behind leaders.',
  'Front-Runner': 'Loves the lead. Gains +1 Speed while in 1st place during the race.',
  'Horse Whisperer': 'Calms difficult horses. Reduces effective Temper by -3, improving consistency.',
  'Lightweight': 'Reduced burden on horse. -1 effective Weight, allowing for slightly better performance.',
  'Veteran': 'Experienced under pressure. Gains +2 Timing when horse Stamina drops below 30%.',
  'Lucky': 'Sometimes avoids disaster. Has a 15% chance to completely avoid stumbles during the race.',
}

export const ABILITY_TOOLTIPS: Record<string, string> = {
  'Heat Resistance': 'Desert Wind ability. Gains +1 Speed on dry and sandy tracks.',
  'Weatherproof': 'Northern Storm ability. Gains +1 Speed when racing in bad weather conditions.',
  'Endurance': 'Iron Heart ability. Takes no stamina penalty during the final 20% of the race.',
  'Chaos Factor': 'Wild Card ability. Increases Temper variance by +50%, making outcomes more unpredictable.',
  'Mud Runner': 'Mudblood ability. Gains +1 Speed when racing on wet or muddy tracks.',
  'Noble Blood': 'Royal Line ability. Gains +1 Speed at all times, representing superior breeding.',
}

export const EQUIPMENT_EFFECT_TOOLTIPS: Record<string, string> = {
  speedMod: 'Direct bonus to horse Speed stat. Higher speed means faster acceleration and top speed.',
  staminaMod: 'Direct bonus to horse Stamina stat. More stamina prevents slowdown in longer races.',
  gritMod: 'Direct bonus to horse Grit stat. Better resistance to terrain penalties and difficult conditions.',
  temperMod: 'Direct bonus to horse Temper stat. Lower temper provides more consistent, predictable performance.',
  ignoreTerrainPenalty: 'Completely negates terrain penalties for specific surface types (mud, sand, etc).',
  stumbleAvoidance: 'Percentage chance to avoid stumbles during the race. Stumbles cause temporary slowdowns.',
}

export const GAME_MECHANIC_TOOLTIPS = {
  upkeep: {
    title: 'Upkeep Cost',
    description: 'Gold paid at the start of each shop phase to maintain your jockey. If you cannot afford upkeep, you lose 1 heart.',
  },
  tier: {
    title: 'Horse Tier',
    description: 'Determines base stat budget and potential. Higher tiers (3-4) have special abilities and better training potential.',
  },
  training: {
    title: 'Training',
    description: 'Improve horse stats up to their genetic potential. Training cost increases with current stat level. Only available for Tier 2+ horses.',
  },
  reroll: {
    title: 'Reroll Shop',
    description: 'Costs 2 gold. Generates a completely new shop inventory with different horses, jockeys, and equipment.',
  },
  goldReward: {
    title: 'Gold Rewards',
    description: '1st place: 3g, 2nd place: 2g, 3rd place: 1g. Used to buy horses, hire jockeys, purchase equipment, and train your stable.',
  },
  heartDamage: {
    title: 'Heart Damage',
    description: 'Taken based on finish position. 8th: -3 hearts, 7th: -2 hearts, 6th/5th: -1 heart. Reach 0 hearts and you are eliminated.',
  },
}
