/**
 * Demo script to showcase generator output
 * Run with: npx tsx game/__tests__/generator-demo.ts
 */

import {
  generateHorse,
  generateJockey,
  generateEquipment,
  generateShopOffering,
} from '../generators'

console.log('🏇 THUNDER HOOVES - Generator Demo\n')

// ============================================================================
// HORSE GENERATION
// ============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('🐴 HORSE EXAMPLES (one per tier)')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

for (const tier of [1, 2, 3, 4] as const) {
  const horse = generateHorse(tier)
  const statsTotal =
    horse.stats.speed + horse.stats.stamina + horse.stats.grit + horse.stats.temper
  const potentialTotal =
    horse.potential.speed +
    horse.potential.stamina +
    horse.potential.grit +
    horse.potential.temper

  console.log(`Tier ${tier}: ${horse.name} (${horse.bloodline})`)
  console.log(`  Stats: SPD ${horse.stats.speed} | STA ${horse.stats.stamina} | GRT ${horse.stats.grit} | TMP ${horse.stats.temper} [Total: ${statsTotal}]`)
  console.log(`  Potential: SPD ${horse.potential.speed} | STA ${horse.potential.stamina} | GRT ${horse.potential.grit} | TMP ${horse.potential.temper} [Total: ${potentialTotal}]`)

  if (horse.ability) {
    console.log(`  Ability: ${horse.ability.name} - ${horse.ability.description}`)
  }

  console.log(`  Cost: ${horse.cost} gold\n`)
}

// ============================================================================
// JOCKEY GENERATION
// ============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('👤 JOCKEY EXAMPLES')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

for (const quality of [1, 2, 3, 4] as const) {
  const jockey = generateJockey(quality)
  const total = jockey.stats.skill + jockey.stats.timing + jockey.stats.weight

  console.log(
    `Quality ${quality}: ${jockey.name} ${jockey.trait ? `[${jockey.trait}]` : ''}`
  )
  console.log(`  Stats: SKL ${jockey.stats.skill} | TMG ${jockey.stats.timing} | WGT ${jockey.stats.weight} [Total: ${total}]`)
  console.log(`  Hire Cost: ${jockey.hireCost} gold | Upkeep: ${jockey.upkeepCost} gold/round\n`)
}

// ============================================================================
// EQUIPMENT GENERATION
// ============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('⚙️  EQUIPMENT EXAMPLES')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

const saddle = generateEquipment('saddle', 2)
const horseshoes = generateEquipment('horseshoes', 2)
const blinders = generateEquipment('blinders', 3)

for (const item of [saddle, horseshoes, blinders]) {
  console.log(`${item.name} (${item.slot})`)
  console.log(`  Effects:`, JSON.stringify(item.effects, null, 2))
  console.log(`  Cost: ${item.cost} gold\n`)
}

// ============================================================================
// SHOP GENERATION
// ============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('🏪 SHOP OFFERING - Round 1 (Early Game)')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

const round1Shop = generateShopOffering(1)

console.log('Horses:')
for (const horse of round1Shop.horses) {
  console.log(
    `  - ${horse.name} (T${horse.tier}, ${horse.bloodline}) - ${horse.cost}g`
  )
}

console.log('\nJockeys:')
for (const jockey of round1Shop.jockeys) {
  console.log(
    `  - ${jockey.name} ${jockey.trait ? `[${jockey.trait}]` : ''} - Hire: ${jockey.hireCost}g, Upkeep: ${jockey.upkeepCost}g/round`
  )
}

console.log('\nEquipment:')
for (const equipment of round1Shop.equipment) {
  console.log(`  - ${equipment.name} (${equipment.slot}) - ${equipment.cost}g`)
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('🏪 SHOP OFFERING - Round 7 (Late Game)')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

const round7Shop = generateShopOffering(7)

console.log('Horses:')
for (const horse of round7Shop.horses) {
  const abilityText = horse.ability ? ` [${horse.ability.name}]` : ''
  console.log(
    `  - ${horse.name} (T${horse.tier}, ${horse.bloodline})${abilityText} - ${horse.cost}g`
  )
}

console.log('\nJockeys:')
for (const jockey of round7Shop.jockeys) {
  console.log(
    `  - ${jockey.name} ${jockey.trait ? `[${jockey.trait}]` : ''} - Hire: ${jockey.hireCost}g, Upkeep: ${jockey.upkeepCost}g/round`
  )
}

console.log('\nEquipment:')
for (const equipment of round7Shop.equipment) {
  console.log(`  - ${equipment.name} (${equipment.slot}) - ${equipment.cost}g`)
}

// ============================================================================
// BLOODLINE DISTRIBUTION TEST
// ============================================================================

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('📊 BLOODLINE DISTRIBUTION (100 horses)')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

const bloodlineCounts: Record<string, number> = {}
for (let i = 0; i < 100; i++) {
  const horse = generateHorse(2)
  bloodlineCounts[horse.bloodline] = (bloodlineCounts[horse.bloodline] || 0) + 1
}

for (const [bloodline, count] of Object.entries(bloodlineCounts).sort(
  (a, b) => b[1] - a[1]
)) {
  const bar = '█'.repeat(Math.floor(count / 2))
  console.log(`${bloodline.padEnd(20)} ${bar} ${count}%`)
}

console.log('\n✅ Generator demo complete!\n')
