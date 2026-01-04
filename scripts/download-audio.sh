#!/bin/bash

# Script to download free placeholder audio for the horse racing game
# Uses public domain and Creative Commons licensed audio

set -e

echo "🎵 Downloading audio files for Horse Racer..."

# Create directories
mkdir -p public/audio/music
mkdir -p public/audio/sfx

# Function to download file with retry
download_file() {
    local url="$1"
    local output="$2"
    local description="$3"

    echo "📥 Downloading: $description"

    if command -v curl &> /dev/null; then
        curl -L -o "$output" "$url" --silent --show-error --fail || {
            echo "⚠️  Failed to download $description"
            return 1
        }
    elif command -v wget &> /dev/null; then
        wget -O "$output" "$url" --quiet || {
            echo "⚠️  Failed to download $description"
            return 1
        }
    else
        echo "❌ Error: Neither curl nor wget found. Please install one of them."
        exit 1
    fi

    echo "✅ Downloaded: $description"
}

echo ""
echo "=== Music Tracks ==="
echo ""

# Lobby Music - Upbeat casual background music
download_file \
    "https://cdn.pixabay.com/download/audio/2022/03/10/audio_4a8f14b7e0.mp3" \
    "public/audio/music/lobby.mp3" \
    "Lobby Music (Casual Upbeat)"

# Shop Music - Calm shopping music
download_file \
    "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3" \
    "public/audio/music/shop.mp3" \
    "Shop Music (Calm)"

# Race Music - Exciting fast-paced music
download_file \
    "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c3f6b8efe6.mp3" \
    "public/audio/music/race.mp3" \
    "Race Music (Exciting)"

echo ""
echo "=== Sound Effects ==="
echo ""

# Button Click - UI click sound
download_file \
    "https://cdn.pixabay.com/download/audio/2021/08/04/audio_12b0c7443c.mp3" \
    "public/audio/sfx/button_click.mp3" \
    "Button Click"

# Purchase - Success/purchase sound
download_file \
    "https://cdn.pixabay.com/download/audio/2021/08/04/audio_bb630cc098.mp3" \
    "public/audio/sfx/purchase.mp3" \
    "Purchase Sound"

# Sell - Cash register sound
download_file \
    "https://cdn.pixabay.com/download/audio/2022/03/15/audio_2ca96c6e07.mp3" \
    "public/audio/sfx/sell.mp3" \
    "Sell Sound"

# Bet Place - Chip/coin sound
download_file \
    "https://cdn.pixabay.com/download/audio/2022/03/10/audio_d1718ab41b.mp3" \
    "public/audio/sfx/bet_place.mp3" \
    "Bet Placement"

# Race Start - Horn/bell sound
download_file \
    "https://cdn.pixabay.com/download/audio/2022/03/24/audio_1d0eac2b53.mp3" \
    "public/audio/sfx/race_start.mp3" \
    "Race Start"

# Race Finish - Finish bell
download_file \
    "https://cdn.pixabay.com/download/audio/2021/08/09/audio_0625c1539c.mp3" \
    "public/audio/sfx/race_finish.mp3" \
    "Race Finish"

# Stumble - Error/negative sound
download_file \
    "https://cdn.pixabay.com/download/audio/2022/03/15/audio_89f7d01cd5.mp3" \
    "public/audio/sfx/stumble.mp3" \
    "Stumble Sound"

# Surge - Power up sound
download_file \
    "https://cdn.pixabay.com/download/audio/2022/03/24/audio_7f45aceed8.mp3" \
    "public/audio/sfx/surge.mp3" \
    "Surge Sound"

# Victory - Winning fanfare
download_file \
    "https://cdn.pixabay.com/download/audio/2021/08/04/audio_d3f1c2f0b0.mp3" \
    "public/audio/sfx/victory.mp3" \
    "Victory Sound"

# Defeat - Losing sound
download_file \
    "https://cdn.pixabay.com/download/audio/2022/03/15/audio_cf31222024.mp3" \
    "public/audio/sfx/defeat.mp3" \
    "Defeat Sound"

# Ready Up - Ready notification
download_file \
    "https://cdn.pixabay.com/download/audio/2022/03/15/audio_14be529350.mp3" \
    "public/audio/sfx/ready_up.mp3" \
    "Ready Up Sound"

echo ""
echo "✨ Audio download complete!"
echo ""
echo "📁 Files saved to:"
echo "   - public/audio/music/ (3 music tracks)"
echo "   - public/audio/sfx/ (11 sound effects)"
echo ""
echo "🎮 Your game is now ready with audio!"
echo ""
echo "Note: These are placeholder sounds from Pixabay (public domain)."
echo "You can replace them with custom audio later if desired."
