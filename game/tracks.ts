import type { Track, TrackCategory, SurfaceCondition } from '@/types/game'

const TRACK_CATEGORIES: TrackCategory[] = ['sprint', 'mixed', 'distance', 'cross_country']

const SURFACE_CONDITIONS: SurfaceCondition[] = [
  'dry_dirt',
  'wet_muddy',
  'turf_grass',
  'rocky',
  'sand',
  'frozen',
]

const TRACK_NAMES = {
  sprint: ['Thunder Downs', 'Lightning Track', 'Flash Circuit', 'Velocity Oval'],
  mixed: ['Champion\'s Way', 'Heritage Track', 'Classic Course', 'Prestige Park'],
  distance: ['Endurance Meadows', 'Marathon Mile', 'Stamina Stretch', 'Long Haul'],
  cross_country: ['Wild Frontier', 'Mountain Pass', 'Forest Trail', 'Canyon Run'],
}

const TRACK_DISTANCES = {
  sprint: { min: 5, max: 7 }, // 5-7 furlongs
  mixed: { min: 8, max: 10 }, // 8-10 furlongs
  distance: { min: 12, max: 16 }, // 12-16 furlongs
  cross_country: { min: 10, max: 14 }, // 10-14 furlongs
}

export function generateTrackForRound(round: number): Track {
  // Rotate through track categories in order
  const categoryIndex = (round - 1) % TRACK_CATEGORIES.length
  const category = TRACK_CATEGORIES[categoryIndex]

  // Randomize surface condition
  const surface = SURFACE_CONDITIONS[Math.floor(Math.random() * SURFACE_CONDITIONS.length)]

  // Pick a random track name for this category
  const namePool = TRACK_NAMES[category]
  const name = namePool[Math.floor(Math.random() * namePool.length)]

  // Set distance based on category
  const distanceRange = TRACK_DISTANCES[category]
  const distance = Math.floor(Math.random() * (distanceRange.max - distanceRange.min + 1)) + distanceRange.min

  const track: Track = {
    id: `track-${round}`,
    name: `${name}`,
    category,
    surface,
    distance,
    description: `A ${category} track with ${surface.replace('_', ' ')} conditions`,
  }

  // Add obstacles for cross-country tracks
  if (category === 'cross_country') {
    const numObstacles = Math.floor(Math.random() * 3) + 2 // 2-4 obstacles
    track.obstacles = []

    for (let i = 0; i < numObstacles; i++) {
      const obstacleTypes: Array<'jump' | 'water' | 'rough_terrain'> = ['jump', 'water', 'rough_terrain']
      const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)]
      const position = Math.floor((i + 1) * (100 / (numObstacles + 1))) // Evenly space obstacles
      const difficulty = Math.floor(Math.random() * 5) + 1 // 1-5

      track.obstacles.push({ type, position, difficulty })
    }
  }

  return track
}
