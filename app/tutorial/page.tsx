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
            and earn gold and reputation.
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
                <li>Expand your stable capacity (max 3) using ⭐ Reputation</li>
                <li>Unlock equipment slots (saddle, horseshoes, blinders) with ⭐ Reputation</li>
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
                <li>Equip items in unlocked slots to boost horse performance</li>
                <li>Pick a race strategy (start/mid/finish focus)</li>
                <li>Consider track conditions when making decisions</li>
              </ul>
            </div>

            {/* Betting Phase */}
            <div className="border-l-4 border-yellow-500 pl-4">
              <h3 className="text-xl font-bold mb-2">💰 Betting Phase</h3>
              <p className="text-gray-300 mb-2">
                Place bets to earn ⭐ Reputation (bets are free, no gold cost).
              </p>
              <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4">
                <li>View all horses competing in the race with their odds</li>
                <li>Choose Place (top 3), Win (1st), or Exacta (1st + 2nd in order)</li>
                <li>Winning bets reward fixed ⭐ Reputation based on bet type</li>
                <li>You cannot bet on your own horse</li>
                <li>If you are below max hearts, Exacta can be a heart recovery bet</li>
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
                <li>Earn gold rewards based on race placement</li>
                <li>Earn ⭐ Reputation for top-3 finishes and winning bets</li>
                <li>Players in lower placements lose hearts as rounds progress</li>
                <li>Losing hearts grants catch-up ⭐ Reputation</li>
                <li>Eliminated players are shown</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Resources */}
        <section className="th-card p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Resources</h2>
          <div className="space-y-2 text-gray-400">
            <p><span className="font-semibold text-gray-200">Gold (💰)</span> buys horses, equipment, and jockeys.</p>
            <p><span className="font-semibold text-gray-200">Reputation (⭐)</span> expands stable slots and unlocks equipment slots.</p>
            <p><span className="font-semibold text-gray-200">Hearts (❤️)</span> track elimination risk; lose them for poor placements.</p>
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
              <h3 className="text-lg font-bold mb-2 text-yellow-400">🛡 Grit</h3>
              <p className="text-gray-400">Resilience in tough moments. Helps maintain performance under pressure.</p>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-2 text-green-400">🌪 Temper</h3>
              <p className="text-gray-400">Composure and discipline. Affects consistency and risk of mistakes.</p>
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
              <span className="font-bold text-blue-400">Northern Storm</span>
              <p className="text-sm text-gray-400">Endurance in harsh weather, grit and stamina synergy.</p>
            </div>
            <div className="bg-gray-800/50 p-3 rounded">
              <span className="font-bold text-purple-400">Desert Wind</span>
              <p className="text-sm text-gray-400">Dry-track specialists with speed and terrain bonuses.</p>
            </div>
            <div className="bg-gray-800/50 p-3 rounded">
              <span className="font-bold text-yellow-400">Iron Heart</span>
              <p className="text-sm text-gray-400">Stamina monsters that scale hard with synergy.</p>
            </div>
            <div className="bg-gray-800/50 p-3 rounded">
              <span className="font-bold text-green-400">Wild Card</span>
              <p className="text-sm text-gray-400">High variance with powerful synergy perks.</p>
            </div>
            <div className="bg-gray-800/50 p-3 rounded">
              <span className="font-bold text-emerald-400">Mudblood</span>
              <p className="text-sm text-gray-400">Thrives in wet and muddy conditions.</p>
            </div>
            <div className="bg-gray-800/50 p-3 rounded">
              <span className="font-bold text-amber-400">Royal Line</span>
              <p className="text-sm text-gray-400">Elite bloodline that buffs your best horse.</p>
            </div>
          </div>
        </section>

        {/* Jockey Traits */}
        <section className="th-card p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Jockey Traits (Skills)</h2>
          <p className="text-gray-300 mb-4">
            Jockeys provide stat bonuses and special abilities:
          </p>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-purple-400">•</span>
              <div>
                <span className="font-bold">Front-Runner</span>
                <span className="text-gray-400"> - Speed boost while leading</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              <div>
                <span className="font-bold">Closer</span>
                <span className="text-gray-400"> - Surge in the final stretch when behind</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400">•</span>
              <div>
                <span className="font-bold">Mudder</span>
                <span className="text-gray-400"> - Big grit bonus on wet tracks</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-yellow-400">•</span>
              <div>
                <span className="font-bold">Horse Whisperer</span>
                <span className="text-gray-400"> - Lowers temper for steadier performance</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-rose-400">•</span>
              <div>
                <span className="font-bold">Lightweight</span>
                <span className="text-gray-400"> - Reduced weight for better speed</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-sky-400">•</span>
              <div>
                <span className="font-bold">Veteran</span>
                <span className="text-gray-400"> - Timing boost under low stamina</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-300">•</span>
              <div>
                <span className="font-bold">Lucky</span>
                <span className="text-gray-400"> - Chance to avoid stumbles</span>
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
              <p className="text-sm text-gray-400">Speed boost with a small stamina tradeoff</p>
            </div>
            <div className="bg-gray-800/50 p-3 rounded">
              <span className="font-bold text-blue-400">Mud Cleats</span>
              <p className="text-sm text-gray-400">Ignore penalties on wet/muddy tracks</p>
            </div>
            <div className="bg-gray-800/50 p-3 rounded">
              <span className="font-bold text-green-400">Calming Blinders</span>
              <p className="text-sm text-gray-400">Lower temper for steadier races</p>
            </div>
            <div className="bg-gray-800/50 p-3 rounded">
              <span className="font-bold text-yellow-400">Lucky Horseshoe</span>
              <p className="text-sm text-gray-400">Chance to avoid stumbles</p>
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
                building strong horses, and making smart bets. If a game reaches late rounds, total
                score (gold + reputation) can decide the winner.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-400 mb-2">💔 How You Lose Hearts</h3>
              <p className="text-gray-300 mb-2">
                After each race, heart loss depends on your placement and the current round. Lose all
                your hearts, and you're eliminated from the game.
              </p>
              <ul className="list-disc list-inside text-gray-400 ml-4">
                <li>Early rounds are forgiving, later rounds punish low placements</li>
                <li>Lower placements can cost 1-2 hearts</li>
                <li>Good race results still earn gold for growth</li>
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
