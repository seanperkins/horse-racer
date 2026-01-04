import Link from 'next/link';

export default function TutorialPage() {
  return (
    <div className="min-h-screen th-bg">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-2">How to Play</h1>
          <p className="text-gray-400">Learn the basics of Horse Racer Auto Battler</p>
        </div>

        {/* Game Overview */}
        <section className="th-card p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Game Overview</h2>
          <p className="text-gray-300 mb-4">
            Horse Racer Auto Battler is a competitive multiplayer game where you build a stable of
            racing horses, bet on races, and compete to be the last player standing. Each round
            consists of several phases where you'll make strategic decisions to strengthen your stable
            and earn gold.
          </p>
          <p className="text-gray-300">
            The game continues until only one player remains. Lose all your hearts, and you're eliminated!
          </p>
        </section>

        {/* Game Phases */}
        <section className="th-card p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Game Phases</h2>

          <div className="space-y-4">
            {/* Shop Phase */}
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="text-xl font-bold mb-2">🛒 Shop Phase</h3>
              <p className="text-gray-300 mb-2">
                Build and improve your stable by buying horses, equipment, and jockeys.
              </p>
              <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4">
                <li>Spend gold to purchase horses with different stats and bloodlines</li>
                <li>Buy equipment to enhance your horses' performance</li>
                <li>Hire jockeys with unique traits and abilities</li>
                <li>Sell units you no longer want to get gold back</li>
                <li>Refresh the shop to see new options (costs 1 gold)</li>
              </ul>
            </div>

            {/* Preparation Phase */}
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="text-xl font-bold mb-2">🏇 Preparation Phase</h3>
              <p className="text-gray-300 mb-2">
                Prepare your horses for the upcoming race by assigning equipment and jockeys.
              </p>
              <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4">
                <li>View the race track details (distance, surface, category)</li>
                <li>Assign jockeys to your horses</li>
                <li>Equip items to boost horse performance</li>
                <li>Consider track conditions when making decisions</li>
              </ul>
            </div>

            {/* Betting Phase */}
            <div className="border-l-4 border-yellow-500 pl-4">
              <h3 className="text-xl font-bold mb-2">💰 Betting Phase</h3>
              <p className="text-gray-300 mb-2">
                Place bets on horses (including your own) to win gold.
              </p>
              <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4">
                <li>View all horses competing in the race with their odds</li>
                <li>Place win, place (top 2), or show (top 3) bets</li>
                <li>Higher odds mean higher potential payouts but lower win probability</li>
                <li>You can bet on your own horses for guaranteed returns if they perform well</li>
                <li>You can skip betting if you prefer to save your gold</li>
              </ul>
            </div>

            {/* Race Phase */}
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="text-xl font-bold mb-2">🏁 Race Phase</h3>
              <p className="text-gray-300 mb-2">
                Watch the race unfold! The outcome is determined by a complex simulation.
              </p>
              <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4">
                <li>Races are simulated based on horse stats, track conditions, and random events</li>
                <li>Watch for stumbles (slowdowns) and surges (speedups)</li>
                <li>Jockey traits and equipment bonuses affect performance</li>
                <li>Track surface and category matter - specialize your horses!</li>
              </ul>
            </div>

            {/* Results Phase */}
            <div className="border-l-4 border-red-500 pl-4">
              <h3 className="text-xl font-bold mb-2">📊 Results Phase</h3>
              <p className="text-gray-300 mb-2">
                See how your horses performed and collect your winnings.
              </p>
              <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4">
                <li>View race results and final placements</li>
                <li>Collect gold from winning bets</li>
                <li>Earn bonus gold if your horses placed well (1st, 2nd, or 3rd)</li>
                <li>Players who didn't earn enough gold lose hearts</li>
                <li>Eliminated players are shown</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Stats & Attributes */}
        <section className="th-card p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Horse Stats</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-bold mb-2 text-purple-400">⚡ Speed</h3>
              <p className="text-gray-400">Base running speed. Higher speed means faster times.</p>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-2 text-blue-400">💪 Stamina</h3>
              <p className="text-gray-400">Endurance over distance. Important for longer races.</p>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-2 text-yellow-400">🎯 Consistency</h3>
              <p className="text-gray-400">Performance reliability. Reduces chance of mistakes.</p>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-2 text-green-400">⭐ Overall Rating</h3>
              <p className="text-gray-400">Combined quality measure. Higher is generally better.</p>
            </div>
          </div>
        </section>

        {/* Bloodlines */}
        <section className="th-card p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Bloodlines</h2>
          <p className="text-gray-300 mb-4">
            Each horse belongs to a bloodline that provides unique bonuses:
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="bg-gray-800/50 p-3 rounded">
              <span className="font-bold text-blue-400">Thoroughbred</span>
              <p className="text-sm text-gray-400">Balanced stats, versatile</p>
            </div>
            <div className="bg-gray-800/50 p-3 rounded">
              <span className="font-bold text-purple-400">Arabian</span>
              <p className="text-sm text-gray-400">High stamina, great for long races</p>
            </div>
            <div className="bg-gray-800/50 p-3 rounded">
              <span className="font-bold text-yellow-400">Quarter Horse</span>
              <p className="text-sm text-gray-400">Explosive speed, sprint specialist</p>
            </div>
            <div className="bg-gray-800/50 p-3 rounded">
              <span className="font-bold text-green-400">Andalusian</span>
              <p className="text-sm text-gray-400">High consistency, reliable performer</p>
            </div>
          </div>
        </section>

        {/* Jockey Traits */}
        <section className="th-card p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Jockey Traits</h2>
          <p className="text-gray-300 mb-4">
            Jockeys provide stat bonuses and special abilities:
          </p>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-purple-400">•</span>
              <div>
                <span className="font-bold">Speed Specialist</span>
                <span className="text-gray-400"> - Increases horse speed</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              <div>
                <span className="font-bold">Stamina Coach</span>
                <span className="text-gray-400"> - Boosts stamina for endurance</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400">•</span>
              <div>
                <span className="font-bold">Consistency Expert</span>
                <span className="text-gray-400"> - Improves reliability</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-yellow-400">•</span>
              <div>
                <span className="font-bold">Track Master</span>
                <span className="text-gray-400"> - Bonuses on specific track types</span>
              </div>
            </div>
          </div>
        </section>

        {/* Equipment */}
        <section className="th-card p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Equipment</h2>
          <p className="text-gray-300 mb-4">
            Equipment items provide stat bonuses and can be equipped to any horse:
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="bg-gray-800/50 p-3 rounded">
              <span className="font-bold text-purple-400">Racing Saddle</span>
              <p className="text-sm text-gray-400">Lightweight, increases speed</p>
            </div>
            <div className="bg-gray-800/50 p-3 rounded">
              <span className="font-bold text-blue-400">Endurance Shoes</span>
              <p className="text-sm text-gray-400">Special horseshoes, boosts stamina</p>
            </div>
            <div className="bg-gray-800/50 p-3 rounded">
              <span className="font-bold text-green-400">Training Bridle</span>
              <p className="text-sm text-gray-400">Improves control and consistency</p>
            </div>
            <div className="bg-gray-800/50 p-3 rounded">
              <span className="font-bold text-yellow-400">Champion Blanket</span>
              <p className="text-sm text-gray-400">All-around stat boost</p>
            </div>
          </div>
        </section>

        {/* Strategy Tips */}
        <section className="th-card p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Strategy Tips</h2>
          <div className="space-y-3">
            <div className="bg-blue-900/20 border-l-4 border-blue-500 p-4">
              <h3 className="font-bold mb-1">💡 Build a Balanced Stable</h3>
              <p className="text-gray-400">
                Don't put all your gold into one horse. A diverse stable helps you succeed across
                different track types and distances.
              </p>
            </div>
            <div className="bg-purple-900/20 border-l-4 border-purple-500 p-4">
              <h3 className="font-bold mb-1">💡 Match Horses to Tracks</h3>
              <p className="text-gray-400">
                Pay attention to track surface and distance. Use sprinters for short races and
                stamina horses for longer tracks.
              </p>
            </div>
            <div className="bg-green-900/20 border-l-4 border-green-500 p-4">
              <h3 className="font-bold mb-1">💡 Strategic Betting</h3>
              <p className="text-gray-400">
                Betting on your own top horses is often safer than betting on competitors. Mix safe
                bets with occasional high-risk, high-reward plays.
              </p>
            </div>
            <div className="bg-yellow-900/20 border-l-4 border-yellow-500 p-4">
              <h3 className="font-bold mb-1">💡 Economy Management</h3>
              <p className="text-gray-400">
                Don't spend all your gold in early rounds. Save some for key purchases and betting
                opportunities. Selling weak horses can help fund better ones.
              </p>
            </div>
            <div className="bg-red-900/20 border-l-4 border-red-500 p-4">
              <h3 className="font-bold mb-1">💡 Equipment and Jockeys Matter</h3>
              <p className="text-gray-400">
                A mediocre horse with great equipment and a skilled jockey can outperform a better
                base horse without them.
              </p>
            </div>
          </div>
        </section>

        {/* Winning Conditions */}
        <section className="th-card p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Winning & Losing</h2>
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-bold text-green-400 mb-2">🏆 How to Win</h3>
              <p className="text-gray-300">
                Be the last player standing! Outlast your opponents by managing your gold wisely,
                building strong horses, and making smart bets.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-400 mb-2">💔 How You Lose Hearts</h3>
              <p className="text-gray-300 mb-2">
                After each race, players must meet a minimum gold threshold. Fall below it, and you
                lose a heart. Lose all your hearts, and you're eliminated from the game.
              </p>
              <ul className="list-disc list-inside text-gray-400 ml-4">
                <li>The gold threshold increases as rounds progress</li>
                <li>Placing well in races earns bonus gold</li>
                <li>Winning bets is crucial to maintaining your gold reserve</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <div className="text-center py-8">
          <Link
            href="/"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            Start Playing Now
          </Link>
        </div>
      </div>
    </div>
  );
}
