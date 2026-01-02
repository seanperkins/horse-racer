'use client'

import { useState } from 'react'
import { useGameStore } from '@/lib/store/gameStore'
import { RadarChart } from './RadarChart'
import { InfoTooltip } from './InfoTooltip'
import { BLOODLINE_TOOLTIPS, JOCKEY_TRAIT_TOOLTIPS, ABILITY_TOOLTIPS, GAME_MECHANIC_TOOLTIPS, EQUIPMENT_EFFECT_TOOLTIPS } from '@/game/tooltips'
import type { ClientMessage } from '@/types/messages'
import type { Horse, Jockey, Equipment } from '@/types/game'

interface ShopPhaseProps {
  sendMessage: (message: ClientMessage) => void
}

interface ShopUnit {
  id: string
  type: 'horse' | 'jockey' | 'equipment'
  name: string
  cost: number
  data: Horse | Jockey | Equipment
}

export function ShopPhase({ sendMessage }: ShopPhaseProps) {
  const playerId = useGameStore((state) => state.playerId)
  const { gold, shopUnits, horses, hiredJockey, equipment, currentRound } = useGameStore()
  const [selectedTab, setSelectedTab] = useState<'shop' | 'inventory'>('shop')

  const handlePurchase = (unit: ShopUnit) => {
    // Jockeys use hire_jockey message instead
    if (unit.type === 'jockey') {
      handleHireJockey(unit.id)
      return
    }

    if (gold < unit.cost) {
      alert('Not enough gold!')
      return
    }

    sendMessage({
      type: 'purchase_unit',
      unitId: unit.id,
      unitType: unit.type,
    })
  }

  const handleHireJockey = (jockeyId: string) => {
    if (hiredJockey) {
      alert('You already have a jockey. Fire them first to hire another.')
      return
    }

    sendMessage({
      type: 'hire_jockey',
      jockeyId,
    })
  }

  const handleFireJockey = () => {
    if (!confirm('Fire your current jockey?')) return

    sendMessage({
      type: 'fire_jockey',
    })
  }

  const handleSell = (unitId: string) => {
    if (!confirm('Sell this unit for 50% of its value?')) return

    sendMessage({
      type: 'sell_unit',
      unitId,
    })
  }

  const handleTrain = (horseId: string, stat: 'speed' | 'stamina' | 'grit' | 'temper') => {
    sendMessage({
      type: 'train_horse',
      horseId,
      stat,
    })
  }

  const handleReroll = () => {
    if (gold < 2) {
      alert('Need 2 gold to reroll!')
      return
    }

    sendMessage({
      type: 'reroll_shop',
    })
  }

  const shopHorses = shopUnits.filter((u) => u.type === 'horse') as ShopUnit[]
  const shopJockeys = shopUnits.filter((u) => u.type === 'jockey') as ShopUnit[]
  const shopEquipment = shopUnits.filter((u) => u.type === 'equipment') as ShopUnit[]

  return (
    <div className="min-h-screen p-4 md:p-8 th-bg">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-end mb-6">
          <InfoTooltip
            title={GAME_MECHANIC_TOOLTIPS.reroll.title}
            description={GAME_MECHANIC_TOOLTIPS.reroll.description}
          >
            <button
              onClick={handleReroll}
              disabled={gold < 2}
              className="th-button disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-bold"
            >
              🔄 Reroll (2g)
            </button>
          </InfoTooltip>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setSelectedTab('shop')}
            className={`px-6 py-2 rounded-lg font-bold transition ${
              selectedTab === 'shop' ? 'th-button' : 'th-panel opacity-70 hover:opacity-100'
            }`}
          >
            🛒 Shop
          </button>
          <button
            onClick={() => setSelectedTab('inventory')}
            className={`px-6 py-2 rounded-lg font-bold transition ${
              selectedTab === 'inventory' ? 'th-button' : 'th-panel opacity-70 hover:opacity-100'
            }`}
          >
            🎒 Inventory ({horses.length + (hiredJockey ? 1 : 0) + equipment.length})
          </button>
        </div>

        {/* Shop Tab */}
        {selectedTab === 'shop' && (
          <div className="space-y-6">
            {/* Horses */}
            <div className="th-panel rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">🐴 Horses</h2>
              {shopHorses.length === 0 ? (
                <div className="text-center th-label py-4">No horses available</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {shopHorses.map((unit) => {
                    const horse = unit.data as Horse
                    return (
                      <HorseCard
                        key={unit.id}
                        horse={horse}
                        cost={unit.cost}
                        canAfford={gold >= unit.cost}
                        onPurchase={() => handlePurchase(unit)}
                      />
                    )
                  })}
                </div>
              )}
            </div>

            {/* Jockeys */}
            <div className="th-panel rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">🏇 Jockeys for Hire</h2>
              {hiredJockey && (
                <div className="mb-4 p-3 bg-green-900/30 border border-green-500 rounded">
                  <div className="text-sm text-green-400 mb-1">Currently Hired:</div>
                  <div className="font-bold">{hiredJockey.name}</div>
                  <div className="text-xs th-label">Upkeep: {hiredJockey.upkeepCost}g/round</div>
                </div>
              )}
              {shopJockeys.length === 0 ? (
                <div className="text-center th-label py-4">No jockeys available</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {shopJockeys.map((unit) => {
                    const jockey = unit.data as Jockey
                    return (
                      <JockeyCard
                        key={unit.id}
                        jockey={jockey}
                        cost={unit.cost}
                        canAfford={gold >= unit.cost && !hiredJockey}
                        onPurchase={() => handlePurchase(unit)}
                        isHireMode={true}
                      />
                    )
                  })}
                </div>
              )}
            </div>

            {/* Equipment */}
            <div className="th-panel rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">⚙️ Equipment</h2>
              {shopEquipment.length === 0 ? (
                <div className="text-center th-label py-4">No equipment available</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {shopEquipment.map((unit) => {
                    const item = unit.data as Equipment
                    return (
                      <EquipmentCard
                        key={unit.id}
                        equipment={item}
                        cost={unit.cost}
                        canAfford={gold >= unit.cost}
                        onPurchase={() => handlePurchase(unit)}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Inventory Tab */}
        {selectedTab === 'inventory' && (
          <div className="space-y-6">
            {/* Horses Inventory */}
            <div className="th-panel rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">🐴 Horses ({horses.length})</h2>
              {horses.length === 0 ? (
                <div className="text-center th-label py-8">No horses owned. Buy some from the shop!</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {horses.map((horse) => (
                    <HorseCard
                      key={horse.id}
                      horse={horse}
                      cost={Math.floor(horse.cost / 2)}
                      canAfford={true}
                      onPurchase={() => handleSell(horse.id)}
                      isInventory
                      onTrain={handleTrain}
                      currentGold={gold}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Hired Jockey */}
            <div className="th-panel rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">🏇 Hired Jockey</h2>
              {!hiredJockey ? (
                <div className="text-center th-label py-8">No jockey hired. Hire one from the shop!</div>
              ) : (
                <div className="max-w-sm">
                  <JockeyCard
                    jockey={hiredJockey}
                    cost={hiredJockey.upkeepCost}
                    canAfford={true}
                    onPurchase={handleFireJockey}
                    isInventory
                    isHireMode={true}
                  />
                </div>
              )}
            </div>

            {/* Equipment Inventory */}
            <div className="th-panel rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">⚙️ Equipment ({equipment.length})</h2>
              {equipment.length === 0 ? (
                <div className="text-center th-label py-8">No equipment owned. Buy some from the shop!</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {equipment.map((item) => (
                    <EquipmentCard
                      key={item.id}
                      equipment={item}
                      cost={Math.floor(item.cost / 2)}
                      canAfford={true}
                      onPurchase={() => handleSell(item.id)}
                      isInventory
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper Components

function HorseCard({
  horse,
  cost,
  canAfford,
  onPurchase,
  isInventory = false,
  onTrain,
  currentGold = 0,
}: {
  horse: Horse
  cost: number
  canAfford: boolean
  onPurchase: () => void
  isInventory?: boolean
  onTrain?: (horseId: string, stat: 'speed' | 'stamina' | 'grit' | 'temper') => void
  currentGold?: number
}) {
  const [showTraining, setShowTraining] = useState(false)

  const getTierColor = (tier: number) => {
    switch (tier) {
      case 1:
        return 'text-gray-400'
      case 2:
        return 'text-green-400'
      case 3:
        return 'text-blue-400'
      case 4:
        return 'text-purple-400'
      default:
        return 'text-gray-400'
    }
  }

  const getTrainingCost = (currentStat: number) => {
    if (currentStat <= 3) return 2
    if (currentStat <= 6) return 3
    if (currentStat <= 8) return 4
    return 5
  }

  const canTrain = isInventory && horse.tier >= 2
  const hasGeneticPotential = horse.tier >= 2 // Show genetic potential for all Tier 2+ horses

  return (
    <div className="th-panel-strong rounded-lg p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <InfoTooltip
            title={GAME_MECHANIC_TOOLTIPS.tier.title}
            description={GAME_MECHANIC_TOOLTIPS.tier.description}
          >
            <div className={`text-sm font-bold ${getTierColor(horse.tier)}`}>Tier {horse.tier}</div>
          </InfoTooltip>
          <div className="text-lg font-bold truncate">{horse.name}</div>
          <InfoTooltip
            title={horse.bloodline}
            description={BLOODLINE_TOOLTIPS[horse.bloodline] || 'Special bloodline with unique bonuses.'}
          >
            <div className="text-sm th-label">{horse.bloodline}</div>
          </InfoTooltip>
        </div>
      </div>

      {/* Radar Chart */}
      <div className="flex justify-center py-2">
        <RadarChart
          stats={{
            spd: horse.stats.speed,
            sta: horse.stats.stamina,
            grt: horse.stats.grit,
            tmp: horse.stats.temper,
          }}
          maxStats={hasGeneticPotential ? {
            spd: horse.potential.speed,
            sta: horse.potential.stamina,
            grt: horse.potential.grit,
            tmp: horse.potential.temper,
          } : undefined}
          statLabels={{
            spd: 'Speed',
            sta: 'Stamina',
            grt: 'Grit',
            tmp: 'Temper',
          }}
          statDescriptions={{
            spd: 'Affects base acceleration and top speed. Higher speed means faster movement.',
            sta: 'Determines energy reserves. Higher stamina prevents slowdown in longer races.',
            grt: 'Resistance to terrain penalties and ability to handle difficult conditions.',
            tmp: 'Consistency of performance. Lower temper means more predictable results.',
          }}
          size={180}
          showLabels={true}
        />
      </div>

      {horse.ability && (
        <InfoTooltip
          title={horse.ability.name}
          description={ABILITY_TOOLTIPS[horse.ability.name] || horse.ability.description}
        >
          <div className="text-sm p-2 bg-purple-500/20 rounded">
            <div className="font-bold text-purple-300">{horse.ability.name}</div>
            <div className="th-label text-xs">{horse.ability.description}</div>
          </div>
        </InfoTooltip>
      )}

      {canTrain && showTraining && onTrain && (
        <div className="space-y-1">
          <InfoTooltip
            title={GAME_MECHANIC_TOOLTIPS.training.title}
            description={GAME_MECHANIC_TOOLTIPS.training.description}
          >
            <div className="text-sm font-bold text-yellow-400">Training Available:</div>
          </InfoTooltip>
          {(['speed', 'stamina', 'grit', 'temper'] as const).map((stat) => {
            const current = horse.stats[stat]
            const potential = horse.potential[stat]
            const canTrainStat = current < potential
            const trainCost = getTrainingCost(current)

            if (!canTrainStat) return null

            return (
              <button
                key={stat}
                onClick={() => {
                  if (currentGold < trainCost) {
                    alert('Not enough gold!')
                    return
                  }
                  onTrain(horse.id, stat)
                }}
                disabled={currentGold < trainCost}
                className="w-full text-sm px-2 py-1 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed rounded flex justify-between items-center"
              >
                <span>
                  {stat}: {current} → {potential}
                </span>
                <span className="text-(--accent-gold)">{trainCost}g</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="mt-auto pt-2 flex gap-2">
        <button
          onClick={onPurchase}
          disabled={!canAfford}
          className={`flex-1 py-2 rounded font-bold text-base ${
            isInventory
              ? 'bg-red-600 hover:bg-red-500'
              : 'th-button disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          {isInventory ? `Sell ${cost}g` : `Buy ${cost}g`}
        </button>
        {canTrain && (
          <button
            onClick={() => setShowTraining(!showTraining)}
            className="px-3 py-2 bg-yellow-600 hover:bg-yellow-500 rounded font-bold text-base"
          >
            {showTraining ? '✕' : '⬆'}
          </button>
        )}
      </div>
    </div>
  )
}

function JockeyCard({
  jockey,
  cost,
  canAfford,
  onPurchase,
  isInventory = false,
  isHireMode = false,
}: {
  jockey: Jockey
  cost: number
  canAfford: boolean
  onPurchase: () => void
  isInventory?: boolean
  isHireMode?: boolean
}) {
  return (
    <div className="th-panel-strong rounded-lg p-4 flex flex-col gap-2">
      <div>
        <div className="text-lg font-bold">{jockey.name}</div>
        {jockey.trait && (
          <InfoTooltip
            title={jockey.trait}
            description={JOCKEY_TRAIT_TOOLTIPS[jockey.trait] || 'Special jockey trait that provides unique advantages.'}
          >
            <div className="text-sm text-blue-400 font-bold">⭐ {jockey.trait}</div>
          </InfoTooltip>
        )}
      </div>

      {/* Radar Chart */}
      <div className="flex justify-center py-2">
        <RadarChart
          stats={{
            skl: jockey.stats.skill,
            tmg: jockey.stats.timing,
            wgt: jockey.stats.weight,
          }}
          statLabels={{
            skl: 'Skill',
            tmg: 'Timing',
            wgt: 'Weight',
          }}
          statDescriptions={{
            skl: 'Jockey expertise. Higher skill improves horse control and strategic execution.',
            tmg: 'Reaction speed and decision timing. Better timing means optimal pace changes.',
            wgt: 'Jockey weight in kg. Lower weight reduces burden on the horse.',
          }}
          size={150}
          showLabels={true}
        />
      </div>

      {isHireMode && !isInventory && (
        <InfoTooltip
          title={GAME_MECHANIC_TOOLTIPS.upkeep.title}
          description={GAME_MECHANIC_TOOLTIPS.upkeep.description}
        >
          <div className="text-sm th-label">
            Upkeep: {jockey.upkeepCost}g/round
          </div>
        </InfoTooltip>
      )}

      <button
        onClick={onPurchase}
        disabled={!canAfford}
        className={`mt-auto py-2 rounded font-bold text-base ${
          isInventory
            ? 'bg-red-600 hover:bg-red-500'
            : 'th-button disabled:opacity-50 disabled:cursor-not-allowed'
        }`}
      >
        {isInventory
          ? `Fire (${cost}g upkeep)`
          : `Hire ${cost}g`
        }
      </button>
    </div>
  )
}

function EquipmentCard({
  equipment,
  cost,
  canAfford,
  onPurchase,
  isInventory = false,
}: {
  equipment: Equipment
  cost: number
  canAfford: boolean
  onPurchase: () => void
  isInventory?: boolean
}) {
  const getSlotIcon = (slot: string) => {
    switch (slot) {
      case 'saddle':
        return '🏇'
      case 'horseshoes':
        return '🔧'
      case 'blinders':
        return '👓'
      default:
        return '⚙️'
    }
  }

  const formatEffect = (key: string, value: any) => {
    if (key === 'ignoreTerrainPenalty') return `Ignores ${value} terrain`
    if (key === 'stumbleAvoidance') return `+${value}% stumble avoid`
    if (key.endsWith('Mod')) {
      const stat = key.replace('Mod', '')
      return `${value > 0 ? '+' : ''}${value} ${stat}`
    }
    return null
  }

  return (
    <div className="th-panel-strong rounded-lg p-4 flex flex-col gap-2">
      <div>
        <div className="text-sm th-label">
          {getSlotIcon(equipment.slot)} {equipment.slot}
        </div>
        <div className="text-lg font-bold">{equipment.name}</div>
      </div>

      <div className="text-sm space-y-1">
        {Object.entries(equipment.effects).map(([key, value]) => {
          const text = formatEffect(key, value)
          if (!text) return null

          const tooltipDescription = EQUIPMENT_EFFECT_TOOLTIPS[key]

          if (tooltipDescription) {
            return (
              <InfoTooltip
                key={key}
                title={text}
                description={tooltipDescription}
              >
                <div className="text-green-400">
                  {text}
                </div>
              </InfoTooltip>
            )
          }

          return (
            <div key={key} className="text-green-400">
              {text}
            </div>
          )
        })}
      </div>

      <button
        onClick={onPurchase}
        disabled={!canAfford}
        className={`mt-auto py-2 rounded font-bold text-base ${
          isInventory
            ? 'bg-red-600 hover:bg-red-500'
            : 'th-button disabled:opacity-50 disabled:cursor-not-allowed'
        }`}
      >
        {isInventory ? `Sell ${cost}g` : `Buy ${cost}g`}
      </button>
    </div>
  )
}
