'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useGameStore } from '@/lib/store/gameStore'
import { useAudioStore } from '@/lib/store/audioStore'
import { HorizontalStatBars } from './HorizontalStatBars'
import { InfoTooltip } from './InfoTooltip'
import { StableCapacityBar } from './StableCapacityBar'
import { EquipmentSlotsBar } from './EquipmentSlotsBar'
import { StrategyImpactPanel } from './StrategyImpactPanel'
import { useStrategyImpact } from '@/lib/hooks/useStrategyImpact'
import { BLOODLINE_TOOLTIPS, JOCKEY_TRAIT_TOOLTIPS, ABILITY_TOOLTIPS, GAME_MECHANIC_TOOLTIPS, EQUIPMENT_EFFECT_TOOLTIPS } from '@/game/tooltips'
import type { ClientMessage } from '@/types/messages'
import type { Horse, Jockey, Equipment, RaceStrategy } from '@/types/game'

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
  const { gold, shopUnits, horses, hiredJockey, equipment, currentRound, stableSlots, currentTrack, unlockedEquipmentSlots } = useGameStore()
  const playSfx = useAudioStore((state) => state.playSfx)
  const [selectedTab, setSelectedTab] = useState<'shop' | 'inventory'>('shop')

  // Preview loadout for comparison
  const [previewHorse, setPreviewHorse] = useState<Horse | null>(null)
  const [previewJockey, setPreviewJockey] = useState<Jockey | null>(null)
  const [previewEquipment, setPreviewEquipment] = useState<{
    saddle?: Equipment
    horseshoes?: Equipment
    blinders?: Equipment
  }>({})

  // Hover state for shop items
  const [hoveredShopItem, setHoveredShopItem] = useState<{
    type: 'horse' | 'jockey' | 'equipment'
    data: Horse | Jockey | Equipment
    slot?: 'saddle' | 'horseshoes' | 'blinders'
  } | null>(null)

  // Hover state for training preview (shows what stats would look like after training)
  const [hoveredTraining, setHoveredTraining] = useState<{
    horse: Horse
    stat: 'speed' | 'stamina' | 'grit' | 'temper'
  } | null>(null)

  // Mobile preview modal state
  const [mobilePreviewItem, setMobilePreviewItem] = useState<{
    type: 'horse' | 'jockey' | 'equipment'
    data: Horse | Jockey | Equipment
    slot?: 'saddle' | 'horseshoes' | 'blinders'
  } | null>(null)

  // Default strategy
  const defaultStrategy: RaceStrategy = { start: 'steady', mid: 'react', finish: 'maintain' }

  // Auto-select first horse, jockey, and equipment (only if there's exactly one of each)
  useEffect(() => {
    if (!previewHorse && horses.length === 1) {
      setPreviewHorse(horses[0])
    }
    if (!previewJockey && hiredJockey) {
      setPreviewJockey(hiredJockey)
    }

    // Auto-select equipment if there's only one of each type
    const saddles = equipment.filter(e => e.slot === 'saddle')
    const horseshoes = equipment.filter(e => e.slot === 'horseshoes')
    const blinders = equipment.filter(e => e.slot === 'blinders')

    setPreviewEquipment(prev => ({
      saddle: prev.saddle || (saddles.length === 1 ? saddles[0] : undefined),
      horseshoes: prev.horseshoes || (horseshoes.length === 1 ? horseshoes[0] : undefined),
      blinders: prev.blinders || (blinders.length === 1 ? blinders[0] : undefined),
    }))
  }, [horses, hiredJockey, equipment, previewHorse, previewJockey])

  // Determine what to show in Strategy Impact Panel
  // Training preview takes priority - creates a modified horse with the trained stat
  const getTrainedHorse = (): Horse | null => {
    if (!hoveredTraining) return null
    const { horse, stat } = hoveredTraining
    return {
      ...horse,
      stats: {
        ...horse.stats,
        [stat]: horse.potential[stat], // Show the stat at its potential value
      },
    }
  }

  const displayHorse = hoveredTraining
    ? getTrainedHorse()
    : hoveredShopItem?.type === 'horse'
      ? (hoveredShopItem.data as Horse)
      : previewHorse

  const displayJockey = hoveredShopItem?.type === 'jockey'
    ? (hoveredShopItem.data as Jockey)
    : previewJockey

  const displayEquipment = hoveredShopItem?.type === 'equipment'
    ? {
        ...previewEquipment,
        [hoveredShopItem.slot!]: hoveredShopItem.data as Equipment,
      }
    : previewEquipment

  // Show panel if we have a complete loadout OR if we're hovering over an item (even without complete loadout)
  const showStrategyPanel = (displayHorse && displayJockey) || hoveredShopItem || hoveredTraining

  const handlePurchase = (unit: ShopUnit) => {
    // Jockeys use hire_jockey message instead
    if (unit.type === 'jockey') {
      handleHireJockey(unit.id)
      return
    }

    // Check stable capacity for horses
    if (unit.type === 'horse' && horses.length >= stableSlots) {
      toast.error(`Stable full! You can only hold ${stableSlots} horses. Expand your stable with Prestige.`)
      return
    }

    // Check equipment slot is unlocked
    if (unit.type === 'equipment') {
      const equipmentSlot = (unit.data as Equipment).slot as 'saddle' | 'horseshoes' | 'blinders'
      if (!unlockedEquipmentSlots.includes(equipmentSlot)) {
        toast.error(`Unlock the ${equipmentSlot} slot first!`)
        return
      }
    }

    if (gold < unit.cost) {
      toast.error('Not enough gold!')
      return
    }

    playSfx('purchase')
    sendMessage({
      type: 'purchase_unit',
      unitId: unit.id,
      unitType: unit.type,
    })
  }

  const handleHireJockey = (jockeyId: string) => {
    if (hiredJockey) {
      toast.error('You already have a jockey. Fire them first to hire another.')
      return
    }

    // Hiring is free - only pay upkeep after races
    playSfx('purchase')
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

    playSfx('sell')
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
      toast.error('Need 2 gold to reroll!')
      return
    }

    sendMessage({
      type: 'reroll_shop',
    })
  }

  const shopHorses = shopUnits.filter((u) => u.type === 'horse') as ShopUnit[]
  const shopJockeys = shopUnits.filter((u) => u.type === 'jockey') as ShopUnit[]
  const shopEquipment = shopUnits.filter((u) => u.type === 'equipment') as ShopUnit[]

  // Debug: Auto-buy and auto-ready with Ctrl+D
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl+D or Cmd+D for quick race
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault()
        console.log('[DEBUG] Quick race triggered!')

        // Buy first horse if we don't have one
        if (horses.length === 0 && shopHorses.length > 0) {
          const firstHorse = shopHorses[0]
          console.log('[DEBUG] Buying first horse:', firstHorse.name)
          sendMessage({
            type: 'purchase_unit',
            unitId: firstHorse.id,
            unitType: 'horse',
          })
        }

        // Hire first jockey if we don't have one
        if (!hiredJockey && shopJockeys.length > 0) {
          const firstJockey = shopJockeys[0]
          console.log('[DEBUG] Hiring first jockey:', firstJockey.name)
          sendMessage({
            type: 'hire_jockey',
            jockeyId: firstJockey.id,
          })
        }

        // Auto-ready after a brief delay to let purchases process
        setTimeout(() => {
          if (playerId) {
            console.log('[DEBUG] Auto-readying player')
            sendMessage({
              type: 'ready_up',
              ready: true,
            })
          }
        }, 100)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [horses, hiredJockey, shopHorses, shopJockeys, playerId, sendMessage])

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-8 th-bg">
      <div className="max-w-7xl mx-auto">
        {/* Debug hint - hidden on mobile */}
        <div className="hidden sm:block text-center text-xs th-muted mb-2">
          Press <kbd className="px-1 py-0.5 rounded th-panel">Ctrl+D</kbd> to quick-start race
        </div>

        {/* Tab Navigation with Reroll Button - stacks on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-4 sm:mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedTab('shop')}
              className={`flex-1 sm:flex-none min-h-11 px-4 sm:px-6 py-2.5 rounded-lg font-bold text-sm sm:text-base transition ${
                selectedTab === 'shop' ? 'th-button' : 'th-panel opacity-70 hover:opacity-100'
              }`}
            >
              🛒 Shop
            </button>
            <button
              onClick={() => setSelectedTab('inventory')}
              className={`flex-1 sm:flex-none min-h-11 px-4 sm:px-6 py-2.5 rounded-lg font-bold text-sm sm:text-base transition ${
                selectedTab === 'inventory' ? 'th-button' : 'th-panel opacity-70 hover:opacity-100'
              }`}
            >
              🎒 <span className="hidden sm:inline">Inventory </span>({horses.length + (hiredJockey ? 1 : 0) + equipment.length})
            </button>
          </div>

          <div className="flex gap-2">
            <InfoTooltip
              title={GAME_MECHANIC_TOOLTIPS.reroll.title}
              description={GAME_MECHANIC_TOOLTIPS.reroll.description}
            >
              <button
                onClick={handleReroll}
                disabled={gold < 2}
                className="th-button disabled:opacity-50 disabled:cursor-not-allowed min-h-11 px-4 py-2.5 rounded-lg font-bold text-sm sm:text-base w-full sm:w-auto"
              >
                🔄 Reroll (2g)
              </button>
            </InfoTooltip>
          </div>
        </div>

        {/* Two-column layout: Content on left, Preview on right (desktop only) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 lg:gap-6">
          {/* Left Column - Main Content */}
          <div className="space-y-4 sm:space-y-6">
            {/* Shop Tab */}
            {selectedTab === 'shop' && (
              <>
                {/* Horses */}
                <div className="th-panel rounded-lg p-3 sm:p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 sm:mb-4">
                    <h2 className="text-lg sm:text-xl font-bold">🐴 Horses</h2>
                    <StableCapacityBar sendMessage={sendMessage} inline />
                  </div>
                  {shopHorses.length === 0 ? (
                    <div className="text-center th-label py-4">No horses available</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                      {shopHorses.map((unit) => {
                        const horse = unit.data as Horse
                        const isStableFull = horses.length >= stableSlots
                        return (
                          <div
                            key={unit.id}
                            onMouseEnter={() => setHoveredShopItem({ type: 'horse', data: horse })}
                            onMouseLeave={() => setHoveredShopItem(null)}
                            className="lg:pointer-events-auto"
                          >
                            <HorseCard
                              horse={horse}
                              cost={unit.cost}
                              canAfford={gold >= unit.cost && !isStableFull}
                              onPurchase={() => handlePurchase(unit)}
                              onPreview={() => setMobilePreviewItem({ type: 'horse', data: horse })}
                              showPreviewButton={true}
                            />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Jockeys */}
                <div className="th-panel rounded-lg p-3 sm:p-4 md:p-6">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h2 className="text-lg sm:text-xl font-bold">🏇 Jockeys for Hire</h2>
                    {hiredJockey && (
                      <button
                        onClick={handleFireJockey}
                        className="text-xs px-3 py-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors border border-red-500/30"
                      >
                        Fire Jockey
                      </button>
                    )}
                  </div>
                  {shopJockeys.length === 0 ? (
                    <div className="text-center th-label py-4">No jockeys available</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                      {shopJockeys.map((unit) => {
                        const jockey = unit.data as Jockey
                        return (
                          <div
                            key={unit.id}
                            onMouseEnter={() => setHoveredShopItem({ type: 'jockey', data: jockey })}
                            onMouseLeave={() => setHoveredShopItem(null)}
                            className="lg:pointer-events-auto"
                          >
                            <JockeyCard
                              jockey={jockey}
                              cost={unit.cost}
                              canAfford={!hiredJockey}
                              onPurchase={() => handlePurchase(unit)}
                              isHireMode={true}
                              onPreview={() => setMobilePreviewItem({ type: 'jockey', data: jockey })}
                              showPreviewButton={true}
                            />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Equipment */}
                <div className="th-panel rounded-lg p-3 sm:p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 sm:mb-4">
                    <h2 className="text-lg sm:text-xl font-bold">⚙️ Equipment</h2>
                    <EquipmentSlotsBar sendMessage={sendMessage} inline />
                  </div>
                  {shopEquipment.length === 0 ? (
                    <div className="text-center th-label py-4">No equipment available</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                      {shopEquipment.map((unit) => {
                        const item = unit.data as Equipment
                        const slotType = item.slot as 'saddle' | 'horseshoes' | 'blinders'
                        const isSlotLocked = !unlockedEquipmentSlots.includes(slotType)
                        return (
                          <div
                            key={unit.id}
                            onMouseEnter={() => setHoveredShopItem({
                              type: 'equipment',
                              data: item,
                              slot: slotType
                            })}
                            onMouseLeave={() => setHoveredShopItem(null)}
                            className="lg:pointer-events-auto"
                          >
                            <EquipmentCard
                              equipment={item}
                              cost={unit.cost}
                              canAfford={gold >= unit.cost}
                              onPurchase={() => handlePurchase(unit)}
                              onPreview={() => setMobilePreviewItem({
                                type: 'equipment',
                                data: item,
                                slot: slotType
                              })}
                              showPreviewButton={true}
                              slotLocked={isSlotLocked}
                            />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Inventory Tab */}
            {selectedTab === 'inventory' && (
              <>
                {/* Horses Inventory */}
                <div className="th-panel rounded-lg p-3 sm:p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 sm:mb-4">
                    <h2 className="text-lg sm:text-xl font-bold">🐴 Horses ({horses.length})</h2>
                    <StableCapacityBar sendMessage={sendMessage} inline />
                  </div>
                  {horses.length === 0 ? (
                    <div className="text-center th-label py-6 sm:py-8 text-sm sm:text-base">No horses owned. Buy some from the shop!</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                      {horses.map((horse) => (
                        <div
                          key={horse.id}
                          onClick={() => setPreviewHorse(previewHorse?.id === horse.id ? null : horse)}
                          className={`cursor-pointer transition-all ${
                            previewHorse?.id === horse.id ? 'ring-2 ring-blue-400 rounded-lg' : ''
                          }`}
                        >
                          <HorseCard
                            horse={horse}
                            cost={Math.floor(horse.cost / 2)}
                            canAfford={true}
                            onPurchase={() => handleSell(horse.id)}
                            isInventory
                            onTrain={handleTrain}
                            onTrainHover={(h, stat) => {
                              if (h && stat) {
                                setHoveredTraining({ horse: h, stat })
                              } else {
                                setHoveredTraining(null)
                              }
                            }}
                            currentGold={gold}
                            isSelected={previewHorse?.id === horse.id}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Hired Jockey */}
                <div className="th-panel rounded-lg p-3 sm:p-4 md:p-6">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h2 className="text-lg sm:text-xl font-bold">🏇 Hired Jockey</h2>
                    {hiredJockey && (
                      <button
                        onClick={handleFireJockey}
                        className="text-xs px-3 py-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors border border-red-500/30"
                      >
                        Fire Jockey
                      </button>
                    )}
                  </div>
                  {!hiredJockey ? (
                    <div className="text-center th-label py-6 sm:py-8 text-sm sm:text-base">No jockey hired. Hire one from the shop!</div>
                  ) : (
                    <div
                      className={`max-w-sm cursor-pointer transition-all ${
                        previewJockey?.id === hiredJockey.id ? 'ring-2 ring-blue-400 rounded-lg' : ''
                      }`}
                      onClick={() => setPreviewJockey(previewJockey?.id === hiredJockey.id ? null : hiredJockey)}
                    >
                      <JockeyCard
                        jockey={hiredJockey}
                        cost={hiredJockey.upkeepCost}
                        canAfford={true}
                        onPurchase={handleFireJockey}
                        isInventory
                        isHireMode={true}
                        isSelected={previewJockey?.id === hiredJockey.id}
                      />
                    </div>
                  )}
                </div>

                {/* Equipment Inventory */}
                <div className="th-panel rounded-lg p-3 sm:p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 sm:mb-4">
                    <h2 className="text-lg sm:text-xl font-bold">⚙️ Equipment ({equipment.length})</h2>
                    <EquipmentSlotsBar sendMessage={sendMessage} inline />
                  </div>
                  {equipment.length === 0 ? (
                    <div className="text-center th-label py-6 sm:py-8 text-sm sm:text-base">No equipment owned. Buy some from the shop!</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                      {equipment.map((item) => {
                        const slotKey = item.slot as 'saddle' | 'horseshoes' | 'blinders'
                        const isEquipmentSelected = previewEquipment[slotKey]?.id === item.id
                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              setPreviewEquipment(prev => ({
                                ...prev,
                                [slotKey]: isEquipmentSelected ? undefined : item
                              }))
                            }}
                            className={`cursor-pointer transition-all ${
                              isEquipmentSelected ? 'ring-2 ring-blue-400 rounded-lg' : ''
                            }`}
                          >
                            <EquipmentCard
                              equipment={item}
                              cost={Math.floor(item.cost / 2)}
                              canAfford={true}
                              onPurchase={() => handleSell(item.id)}
                              isInventory
                              isSelected={isEquipmentSelected}
                            />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right Column - Preview Panel (desktop only) */}
          {showStrategyPanel && (
            <div className="hidden lg:block lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
              <ShopComparisonPanel
                previewHorse={previewHorse}
                previewJockey={previewJockey}
                previewEquipment={previewEquipment}
                hoveredItem={hoveredShopItem}
                hoveredTraining={hoveredTraining}
                displayHorse={displayHorse}
                displayJockey={displayJockey}
                displayEquipment={displayEquipment}
                strategy={defaultStrategy}
                currentTrack={currentTrack}
              />
            </div>
          )}
        </div>

        {/* Mobile Preview Modal */}
        {mobilePreviewItem && (
          <div className="lg:hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--bg-primary)] rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              {/* Header with close button */}
              <div className="sticky top-0 bg-[var(--bg-primary)] border-b border-[var(--outline)] p-4 flex items-center justify-between">
                <h3 className="font-bold text-lg">Preview</h3>
                <button
                  onClick={() => setMobilePreviewItem(null)}
                  className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                  aria-label="Close preview"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Preview content */}
              <div className="p-4">
                <ShopComparisonPanel
                  previewHorse={previewHorse}
                  previewJockey={previewJockey}
                  previewEquipment={previewEquipment}
                  hoveredItem={mobilePreviewItem}
                  displayHorse={mobilePreviewItem.type === 'horse' ? (mobilePreviewItem.data as Horse) : previewHorse}
                  displayJockey={mobilePreviewItem.type === 'jockey' ? (mobilePreviewItem.data as Jockey) : previewJockey}
                  displayEquipment={mobilePreviewItem.type === 'equipment' ? {
                    ...previewEquipment,
                    [mobilePreviewItem.slot!]: mobilePreviewItem.data as Equipment
                  } : previewEquipment}
                  strategy={defaultStrategy}
                  currentTrack={currentTrack}
                />
              </div>

              {/* Buy button at bottom */}
              <div className="sticky bottom-0 bg-[var(--bg-primary)] border-t border-[var(--outline)] p-4">
                <button
                  onClick={() => {
                    const shopUnit = shopUnits.find(u => u.data === mobilePreviewItem.data)
                    if (shopUnit) {
                      handlePurchase(shopUnit)
                      setMobilePreviewItem(null)
                    }
                  }}
                  disabled={(() => {
                    const shopUnit = shopUnits.find(u => u.data === mobilePreviewItem.data)
                    if (!shopUnit) return true
                    if (mobilePreviewItem.type === 'horse') {
                      return gold < shopUnit.cost || horses.length >= stableSlots
                    }
                    if (mobilePreviewItem.type === 'jockey') {
                      return !!hiredJockey  // Hiring is free, only check if already hired
                    }
                    if (mobilePreviewItem.type === 'equipment') {
                      const equipSlot = (mobilePreviewItem.data as Equipment).slot as 'saddle' | 'horseshoes' | 'blinders'
                      if (!unlockedEquipmentSlots.includes(equipSlot)) return true
                    }
                    return gold < shopUnit.cost
                  })()}
                  className="w-full th-button disabled:opacity-50 disabled:cursor-not-allowed min-h-11 py-2.5 rounded-lg font-bold"
                >
                  {(() => {
                    const shopUnit = shopUnits.find(u => u.data === mobilePreviewItem.data)
                    if (!shopUnit) return 'Not available'
                    const cost = shopUnit.cost
                    if (mobilePreviewItem.type === 'horse') {
                      if (horses.length >= stableSlots) return 'Stable Full'
                      return `Buy ${cost}g`
                    }
                    if (mobilePreviewItem.type === 'jockey') {
                      if (hiredJockey) return 'Already Hired'
                      return 'Hire'
                    }
                    if (mobilePreviewItem.type === 'equipment') {
                      const equipSlot = (mobilePreviewItem.data as Equipment).slot as 'saddle' | 'horseshoes' | 'blinders'
                      if (!unlockedEquipmentSlots.includes(equipSlot)) return '🔒 Slot Locked'
                    }
                    return `Buy ${cost}g`
                  })()}
                </button>
              </div>
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
  onTrainHover,
  currentGold = 0,
  onPreview,
  showPreviewButton = false,
  isSelected = false,
}: {
  horse: Horse
  cost: number
  canAfford: boolean
  onPurchase: () => void
  isInventory?: boolean
  onTrain?: (horseId: string, stat: 'speed' | 'stamina' | 'grit' | 'temper') => void
  onTrainHover?: (horse: Horse, stat: 'speed' | 'stamina' | 'grit' | 'temper') => void
  currentGold?: number
  onPreview?: () => void
  showPreviewButton?: boolean
  isSelected?: boolean
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
    <div className={`th-panel-strong rounded-lg p-4 flex flex-col gap-2 relative ${isSelected ? 'ring-2 ring-inset ring-blue-400' : ''}`}>
      {isSelected && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold z-10">
          SELECTED
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <InfoTooltip
              title={GAME_MECHANIC_TOOLTIPS.tier.title}
              description={GAME_MECHANIC_TOOLTIPS.tier.description}
            >
              <div className={`text-sm font-bold ${getTierColor(horse.tier)}`}>Tier {horse.tier}</div>
            </InfoTooltip>
            {showPreviewButton && onPreview && (
              <button
                onClick={onPreview}
                className="lg:hidden text-xs text-blue-400 hover:text-blue-300 underline whitespace-nowrap"
              >
                📊 Preview
              </button>
            )}
          </div>
          <div className="text-lg font-bold truncate">{horse.name}</div>
          <InfoTooltip
            title={horse.bloodline}
            description={BLOODLINE_TOOLTIPS[horse.bloodline] || 'Special bloodline with unique bonuses.'}
          >
            <div className="text-sm th-label">{horse.bloodline}</div>
          </InfoTooltip>
        </div>
      </div>

      {/* Stats */}
      <div className="py-2">
        <HorizontalStatBars
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
                    toast.error('Not enough gold!')
                    return
                  }
                  onTrain(horse.id, stat)
                }}
                onMouseEnter={() => onTrainHover?.(horse, stat)}
                onMouseLeave={() => onTrainHover?.(null as any, null as any)}
                disabled={currentGold < trainCost}
                className="w-full text-sm px-2 py-1 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed rounded flex justify-between items-center"
              >
                <span>
                  {stat}: {current} → {potential}
                </span>
                <span className="text-[var(--accent-gold)]">{trainCost}g</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="mt-auto pt-2">
        <div className="flex gap-2">
          <button
            onClick={onPurchase}
            disabled={!canAfford}
            className={`flex-1 min-h-11 py-2.5 rounded font-bold text-sm sm:text-base ${
              isInventory
                ? 'bg-red-600 hover:bg-red-500 active:bg-red-400'
                : 'th-button disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {isInventory ? `Sell ${cost}g` : `Buy ${cost}g`}
          </button>
          {canTrain && (
            <InfoTooltip
              title="Training"
              description="Train your horse to improve stats up to their genetic potential. Higher stats cost more gold."
            >
              <button
                onClick={() => setShowTraining(!showTraining)}
                className="min-h-11 min-w-11 px-3 py-2.5 bg-yellow-600 hover:bg-yellow-500 active:bg-yellow-400 rounded font-bold text-sm sm:text-base"
              >
                {showTraining ? '✕' : '⬆'}
              </button>
            </InfoTooltip>
          )}
        </div>
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
  onPreview,
  showPreviewButton = false,
  isSelected = false,
}: {
  jockey: Jockey
  cost: number
  canAfford: boolean
  onPurchase: () => void
  isInventory?: boolean
  isHireMode?: boolean
  onPreview?: () => void
  showPreviewButton?: boolean
  isSelected?: boolean
}) {
  return (
    <div className={`th-panel-strong rounded-lg p-4 flex flex-col gap-2 relative ${isSelected ? 'ring-2 ring-inset ring-blue-400' : ''}`}>
      {isSelected && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold z-10">
          SELECTED
        </div>
      )}
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-lg font-bold">{jockey.name}</div>
          {showPreviewButton && onPreview && (
            <button
              onClick={onPreview}
              className="lg:hidden text-xs text-blue-400 hover:text-blue-300 underline whitespace-nowrap"
            >
              📊 Preview
            </button>
          )}
        </div>
        {jockey.trait && (
          <InfoTooltip
            title={jockey.trait}
            description={JOCKEY_TRAIT_TOOLTIPS[jockey.trait] || 'Special jockey trait that provides unique advantages.'}
          >
            <div className="text-sm text-blue-400 font-bold">⭐ {jockey.trait}</div>
          </InfoTooltip>
        )}
      </div>

      {/* Stats */}
      <div className="py-2">
        <HorizontalStatBars
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
        className={`mt-auto w-full min-h-11 py-2.5 rounded font-bold text-sm sm:text-base ${
          isInventory
            ? 'bg-red-600 hover:bg-red-500 active:bg-red-400'
            : 'th-button disabled:opacity-50 disabled:cursor-not-allowed'
        }`}
      >
        {isInventory
          ? `Fire (${cost}g upkeep)`
          : 'Hire'
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
  onPreview,
  showPreviewButton = false,
  isSelected = false,
  slotLocked = false,
}: {
  equipment: Equipment
  cost: number
  canAfford: boolean
  onPurchase: () => void
  isInventory?: boolean
  onPreview?: () => void
  showPreviewButton?: boolean
  isSelected?: boolean
  slotLocked?: boolean
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
    <div className={`th-panel-strong rounded-lg p-4 flex flex-col gap-2 relative ${isSelected ? 'ring-2 ring-inset ring-blue-400' : ''}`}>
      {isSelected && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold z-10">
          SELECTED
        </div>
      )}
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm th-label">
            {getSlotIcon(equipment.slot)} {equipment.slot}
          </div>
          {showPreviewButton && onPreview && (
            <button
              onClick={onPreview}
              className="lg:hidden text-xs text-blue-400 hover:text-blue-300 underline whitespace-nowrap"
            >
              📊 Preview
            </button>
          )}
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
        disabled={!canAfford || slotLocked}
        className={`mt-auto w-full min-h-11 py-2.5 rounded font-bold text-sm sm:text-base ${
          isInventory
            ? 'bg-red-600 hover:bg-red-500 active:bg-red-400'
            : 'th-button disabled:opacity-50 disabled:cursor-not-allowed'
        }`}
      >
        {slotLocked ? '🔒 Slot Locked' : isInventory ? `Sell ${cost}g` : `Buy ${cost}g`}
      </button>
    </div>
  )
}

// Shop Comparison Panel Component
function ShopComparisonPanel({
  previewHorse,
  previewJockey,
  previewEquipment,
  hoveredItem,
  hoveredTraining,
  displayHorse,
  displayJockey,
  displayEquipment,
  strategy,
  currentTrack,
}: {
  previewHorse: Horse | null
  previewJockey: Jockey | null
  previewEquipment: { saddle?: Equipment; horseshoes?: Equipment; blinders?: Equipment }
  hoveredItem: { type: string; data: any; slot?: string } | null
  hoveredTraining?: { horse: Horse; stat: 'speed' | 'stamina' | 'grit' | 'temper' } | null
  displayHorse: Horse | null
  displayJockey: Jockey | null
  displayEquipment: { saddle?: Equipment; horseshoes?: Equipment; blinders?: Equipment }
  strategy: RaceStrategy
  currentTrack: any
}) {
  // Calculate current preview stats
  const currentStats = useStrategyImpact(previewHorse, previewJockey, previewEquipment, strategy)

  // Calculate hovered stats
  const hoveredStats = useStrategyImpact(displayHorse, displayJockey, displayEquipment, strategy)

  // Check if we're hovering over anything (shop item OR training)
  const isHovering = hoveredItem || hoveredTraining

  // Helper to format delta
  const formatDelta = (current: number | undefined, hovered: number | undefined) => {
    if (current === undefined || hovered === undefined || !isHovering) return null
    const delta = hovered - current
    if (Math.abs(delta) < 0.01) return null
    return delta
  }

  // Stat descriptions for tooltips
  const statDescriptions: Record<string, string> = {
    'Speed': 'Base movement speed - higher is better',
    'Stamina': 'Energy pool for maintaining pace - higher is better',
    'Grit': 'Ability to push through fatigue - higher is better',
    'Temper': 'Consistency and control - higher is more stable',
    'Effective Speed': 'Final speed after all modifiers',
    'Stamina Pool': 'Total available energy for the race',
    'Burn Rate': 'Energy consumed per tick - lower is better',
    'Efficiency': 'How effectively stamina is converted to speed - higher is better',
  }

  const DeltaDisplay = ({ delta, inverse = false }: { delta: number | null; inverse?: boolean }) => {
    if (delta === null) return <span className="w-16 text-right text-xs th-label">-</span>
    const isPositive = inverse ? delta < 0 : delta > 0
    return (
      <span className={`w-16 text-right text-xs font-semibold ${isPositive ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
        {delta > 0 ? '+' : ''}{delta.toFixed(2)}
      </span>
    )
  }

  const StatRow = ({
    label,
    value,
    delta,
    inverse = false,
    tooltip
  }: {
    label: string
    value: string | number
    delta: number | null
    inverse?: boolean
    tooltip?: string
  }) => {
    const [showTooltip, setShowTooltip] = useState(false)

    return (
      <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center text-sm">
        <div className="flex items-center gap-1">
          <span>{label}</span>
          <div className="relative">
            <button
              className="w-3 h-3 rounded-full border border-current opacity-50 hover:opacity-100 flex items-center justify-center text-[10px] leading-none"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
            >
              i
            </button>
            {showTooltip && tooltip && (
              <div className="absolute left-0 top-full mt-1 w-48 p-2 text-xs th-panel rounded shadow-lg z-10 border border-[var(--outline)]">
                {tooltip}
              </div>
            )}
          </div>
        </div>
        <span className="font-bold tabular-nums w-12 text-right">{value}</span>
        <DeltaDisplay delta={delta} inverse={inverse} />
      </div>
    )
  }

  // Show comparison or standalone view
  const hasCurrentLoadout = previewHorse && previewJockey

  // Allow comparisons when:
  // 1. You have a complete loadout (horse + jockey) - show full comparison
  // 2. You have a horse and hover jockey - show how jockey affects the horse
  // 3. You have a jockey and hover horse - show how horse affects the jockey
  // 4. You're comparing same type items (horse-to-horse or jockey-to-jockey)
  const canCompare = hoveredItem && (
    hasCurrentLoadout || // Complete loadout
    (hoveredItem.type === 'horse' && previewHorse) || // Horse-to-horse comparison
    (hoveredItem.type === 'jockey' && previewJockey) || // Jockey-to-jockey comparison
    (hoveredItem.type === 'jockey' && previewHorse) || // Adding jockey to horse
    (hoveredItem.type === 'horse' && previewJockey) // Adding horse to jockey
  )

  const showComparison = canCompare

  return (
    <div className="th-panel rounded-lg p-4 shadow-2xl max-w-md">
      <h3 className="font-bold mb-3 text-sm">
        {hoveredTraining
          ? `⬆ Training ${hoveredTraining.stat.charAt(0).toUpperCase() + hoveredTraining.stat.slice(1)}`
          : hoveredItem
            ? '👀 Preview'
            : '📊 Current Loadout'}
      </h3>

      {/* Compact loadout summary - same format for hover and non-hover */}
      <div className="mb-4 space-y-1.5 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-14 text-xs th-muted">Horse:</span>
          <span className={displayHorse ? 'th-label' : 'th-muted italic'}>
            {displayHorse ? `${displayHorse.name} (T${displayHorse.tier})` : '—'}
          </span>
          {hoveredItem?.type === 'horse' && previewHorse && (
            <span className="text-xs text-yellow-400">← preview</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-14 text-xs th-muted">Jockey:</span>
          <span className={displayJockey ? 'th-label' : 'th-muted italic'}>
            {displayJockey?.name || '—'}
          </span>
          {hoveredItem?.type === 'jockey' && previewJockey && (
            <span className="text-xs text-yellow-400">← preview</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-14 text-xs th-muted">Saddle:</span>
          <span className={displayEquipment.saddle ? 'th-label' : 'th-muted'}>
            {displayEquipment.saddle?.name || '—'}
          </span>
          {hoveredItem?.type === 'equipment' && hoveredItem.slot === 'saddle' && previewEquipment.saddle && (
            <span className="text-xs text-yellow-400">← preview</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-14 text-xs th-muted">Shoes:</span>
          <span className={displayEquipment.horseshoes ? 'th-label' : 'th-muted'}>
            {displayEquipment.horseshoes?.name || '—'}
          </span>
          {hoveredItem?.type === 'equipment' && hoveredItem.slot === 'horseshoes' && previewEquipment.horseshoes && (
            <span className="text-xs text-yellow-400">← preview</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-14 text-xs th-muted">Blinders:</span>
          <span className={displayEquipment.blinders ? 'th-label' : 'th-muted'}>
            {displayEquipment.blinders?.name || '—'}
          </span>
          {hoveredItem?.type === 'equipment' && hoveredItem.slot === 'blinders' && previewEquipment.blinders && (
            <span className="text-xs text-yellow-400">← preview</span>
          )}
        </div>
        {/* Terrain - always show if track available */}
        {currentTrack && (
          <div className="flex items-center gap-2">
            <span className="w-14 text-xs th-muted">Terrain:</span>
            <span className="th-label capitalize">{currentTrack.surface?.replace('_', ' ')}</span>
            {hoveredStats.terrainAlignment && (
              <span className={`text-xs font-semibold ${
                hoveredStats.terrainAlignment.modifier < 1.0 ? 'text-[var(--accent-red)]' :
                hoveredStats.terrainAlignment.modifier > 1.0 ? 'text-[var(--accent-green)]' : 'th-muted'
              }`}>
                ({hoveredStats.terrainAlignment.modifier >= 1.0 ? '+' : ''}
                {((hoveredStats.terrainAlignment.modifier - 1) * 100).toFixed(0)}%)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Base Stats - Show when we have a loadout (with or without hover) */}
      {(hasCurrentLoadout || showComparison) && (currentStats.speedBreakdown || hoveredStats.speedBreakdown) && (
        <div className="mb-4">
          <h4 className="text-xs th-label mb-2 uppercase tracking-wide">Base Stats</h4>
          <div className="space-y-2">
            <StatRow
              label="Speed"
              value={isHovering ? hoveredStats.speedBreakdown?.final || 0 : currentStats.speedBreakdown?.final || 0}
              delta={formatDelta(currentStats.speedBreakdown?.final, hoveredStats.speedBreakdown?.final)}
              tooltip={statDescriptions['Speed']}
            />
            <StatRow
              label="Stamina"
              value={isHovering ? hoveredStats.staminaBreakdown?.final || 0 : currentStats.staminaBreakdown?.final || 0}
              delta={formatDelta(currentStats.staminaBreakdown?.final, hoveredStats.staminaBreakdown?.final)}
              tooltip={statDescriptions['Stamina']}
            />
            <StatRow
              label="Grit"
              value={isHovering ? hoveredStats.gritBreakdown?.final || 0 : currentStats.gritBreakdown?.final || 0}
              delta={formatDelta(currentStats.gritBreakdown?.final, hoveredStats.gritBreakdown?.final)}
              tooltip={statDescriptions['Grit']}
            />
            <StatRow
              label="Temper"
              value={isHovering ? hoveredStats.temperBreakdown?.final || 0 : currentStats.temperBreakdown?.final || 0}
              delta={formatDelta(currentStats.temperBreakdown?.final, hoveredStats.temperBreakdown?.final)}
              tooltip={statDescriptions['Temper']}
            />
          </div>
        </div>
      )}

      {/* Standalone stats view when no current loadout */}
      {!hasCurrentLoadout && hoveredItem && (
        <div className="mb-4">
          <h4 className="text-xs th-label mb-2 uppercase tracking-wide">
            {hoveredItem.type === 'horse' ? 'Horse Stats' : hoveredItem.type === 'jockey' ? 'Jockey Stats' : 'Equipment Effects'}
          </h4>
          {hoveredItem.type === 'horse' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>Speed</span>
                <span className="font-bold">{(hoveredItem.data as Horse).stats.speed}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Stamina</span>
                <span className="font-bold">{(hoveredItem.data as Horse).stats.stamina}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Grit</span>
                <span className="font-bold">{(hoveredItem.data as Horse).stats.grit}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Temper</span>
                <span className="font-bold">{(hoveredItem.data as Horse).stats.temper}</span>
              </div>
              {(hoveredItem.data as Horse).ability && (
                <div className="mt-3 p-2 bg-purple-500/20 rounded border border-purple-500/30">
                  <div className="text-sm font-bold text-purple-300">{(hoveredItem.data as Horse).ability!.name}</div>
                  <div className="text-xs th-label mt-1">{(hoveredItem.data as Horse).ability!.description}</div>
                </div>
              )}
            </div>
          )}
          {hoveredItem.type === 'jockey' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>Skill</span>
                <span className="font-bold">{(hoveredItem.data as Jockey).stats.skill}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Timing</span>
                <span className="font-bold">{(hoveredItem.data as Jockey).stats.timing}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Weight</span>
                <span className="font-bold">{(hoveredItem.data as Jockey).stats.weight}kg</span>
              </div>
              {(hoveredItem.data as Jockey).trait && (
                <div className="mt-3 p-2 bg-blue-500/20 rounded border border-blue-500/30">
                  <div className="text-sm font-bold text-blue-300">⭐ {(hoveredItem.data as Jockey).trait}</div>
                </div>
              )}
            </div>
          )}
          {hoveredItem.type === 'equipment' && (
            <div className="space-y-2 text-sm">
              {Object.entries((hoveredItem.data as Equipment).effects).map(([key, value]) => {
                let displayText = ''
                if (key === 'ignoreTerrainPenalty') displayText = `Ignores ${value} terrain`
                else if (key === 'stumbleAvoidance') displayText = `+${value}% stumble avoid`
                else if (key.endsWith('Mod')) {
                  const stat = key.replace('Mod', '')
                  const numValue = typeof value === 'number' ? value : 0
                  displayText = `${numValue > 0 ? '+' : ''}${numValue} ${stat}`
                }
                if (!displayText) return null
                return (
                  <div key={key} className="flex justify-between items-center">
                    <span>{displayText}</span>
                    <span className="text-green-400">✓</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Derived Stats - Show when we have a loadout (with or without hover) */}
      {(hasCurrentLoadout || showComparison) && (currentStats.derivedStats || hoveredStats.derivedStats) && (
        <div className="mb-4">
          <h4 className="text-xs th-label mb-2 uppercase tracking-wide">Derived Stats</h4>
          <div className="space-y-2">
            <StatRow
              label="Effective Speed"
              value={isHovering && hoveredStats.derivedStats ? hoveredStats.derivedStats.baseSpeed.toFixed(1) : currentStats.derivedStats?.baseSpeed.toFixed(1) || '0'}
              delta={formatDelta(currentStats.derivedStats?.baseSpeed, hoveredStats.derivedStats?.baseSpeed)}
              tooltip={statDescriptions['Effective Speed']}
            />
            <StatRow
              label="Stamina Pool"
              value={isHovering && hoveredStats.derivedStats ? hoveredStats.derivedStats.staminaPool.toFixed(1) : currentStats.derivedStats?.staminaPool.toFixed(1) || '0'}
              delta={formatDelta(currentStats.derivedStats?.staminaPool, hoveredStats.derivedStats?.staminaPool)}
              tooltip={statDescriptions['Stamina Pool']}
            />
            <StatRow
              label="Burn Rate"
              value={isHovering && hoveredStats.derivedStats ? `${hoveredStats.derivedStats.burnRate.toFixed(2)}/tk` : `${currentStats.derivedStats?.burnRate.toFixed(2) || '0'}/tk`}
              delta={formatDelta(currentStats.derivedStats?.burnRate, hoveredStats.derivedStats?.burnRate)}
              inverse={true}
              tooltip={statDescriptions['Burn Rate']}
            />
            <StatRow
              label="Efficiency"
              value={isHovering && hoveredStats.derivedStats ? `${(hoveredStats.derivedStats.efficiency * 100).toFixed(0)}%` : `${((currentStats.derivedStats?.efficiency || 0) * 100).toFixed(0)}%`}
              delta={formatDelta(currentStats.derivedStats ? currentStats.derivedStats.efficiency * 100 : undefined, hoveredStats.derivedStats ? hoveredStats.derivedStats.efficiency * 100 : undefined)}
              tooltip={statDescriptions['Efficiency']}
            />
          </div>
        </div>
      )}

      {/* Show terrain info for horses when no current loadout */}
      {!hasCurrentLoadout && hoveredItem && hoveredItem.type === 'horse' && currentTrack && (
        <div className="mb-4">
          <h4 className="text-xs th-label mb-2 uppercase tracking-wide">Bloodline</h4>
          <div className="text-sm">
            <div className="flex justify-between items-center mb-2">
              <span>{(hoveredItem.data as Horse).bloodline}</span>
            </div>
            {(() => {
              const horse = hoveredItem.data as Horse
              const bloodline = horse.bloodline
              const trackSurface = currentTrack.surface.replace('_', ' ')

              // Show bloodline synergy requirements
              let synergyInfo = ''
              if (bloodline === 'Mudblood') {
                synergyInfo = trackSurface === 'wet muddy'
                  ? '2+ Mudblood: +2 Grit\n3+ Mudblood: Gain speed in mud'
                  : 'Bonuses apply on wet muddy tracks'
              } else if (bloodline === 'Desert Wind') {
                synergyInfo = trackSurface === 'dry dirt'
                  ? '2+ Desert Wind: +2 Speed\n3+ Desert Wind: +2 Stamina'
                  : 'Bonuses apply on dry dirt tracks'
              } else if (bloodline === 'Northern Storm') {
                synergyInfo = trackSurface === 'rocky'
                  ? '2+ Northern Storm: +2 Grit\n3+ Northern Storm: Ignore rocky terrain'
                  : 'Bonuses apply on rocky tracks'
              }

              return synergyInfo ? (
                <div className="mt-2 p-2 rounded border border-purple-500/30 bg-purple-500/10 text-xs">
                  {synergyInfo.split('\n').map((line, i) => (
                    <div key={i} className="text-purple-300">{line}</div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 p-2 rounded border border-gray-500/30 bg-gray-500/10 text-xs th-label">
                  No terrain bonuses
                </div>
              )
            })()}
            <div className="mt-2 text-xs th-label">
              Next Track: {currentTrack.surface.replace('_', ' ')}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
