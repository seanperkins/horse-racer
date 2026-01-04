#!/usr/bin/env node

/**
 * Generate placeholder audio files using Web Audio API
 * Creates simple beep/tone sounds for testing the audio system
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Check if ffmpeg is available
async function checkFFmpeg() {
  try {
    await execAsync('which ffmpeg');
    return true;
  } catch {
    return false;
  }
}

const AUDIO_GUIDE = `
🎵 AUDIO SETUP GUIDE FOR HORSE RACER
====================================

The audio files are missing. Here are your options:

OPTION 1: Download Free Audio Assets (Recommended)
---------------------------------------------------

Visit these sites and download appropriate audio:

MUSIC (save to public/audio/music/):
• lobby.mp3 - Casual, upbeat background music
• shop.mp3 - Calm shopping/menu music
• race.mp3 - Exciting, fast-paced racing music

Recommended sources:
- Pixabay: https://pixabay.com/music/ (public domain)
- Incompetech: https://incompetech.com/music/royalty-free/music.html
- OpenGameArt: https://opengameart.org/art-search?keys=music

SOUND EFFECTS (save to public/audio/sfx/):
• button_click.mp3 - UI click sound
• purchase.mp3 - Success/buy sound
• sell.mp3 - Cash register/sell sound
• bet_place.mp3 - Coin/chip placement
• race_start.mp3 - Horn/bell start signal
• race_finish.mp3 - Finish bell/chime
• stumble.mp3 - Error/negative sound
• surge.mp3 - Power-up/boost sound
• victory.mp3 - Winning fanfare
• defeat.mp3 - Losing sound
• ready_up.mp3 - Ready notification beep

Recommended sources:
- Freesound: https://freesound.org/ (Creative Commons)
- Pixabay: https://pixabay.com/sound-effects/ (public domain)
- Zapsplat: https://www.zapsplat.com/ (free with attribution)

OPTION 2: AI-Generated Audio
-----------------------------

Use AI tools to generate custom audio:

For Music:
- Suno AI: https://suno.ai/ (free tier available)
- Udio: https://udio.com/
- Soundraw: https://soundraw.io/

For Sound Effects:
- ElevenLabs Sound Effects: https://elevenlabs.io/sound-effects
- MyEdit: https://myedit.online/audio-editor/sound-effect-generator

OPTION 3: Disable Audio
------------------------

If you want to develop without audio, the game will work fine.
The audio system gracefully handles missing files with no errors.

=====================================

After downloading, place the files in:
  public/audio/music/ (3 files)
  public/audio/sfx/ (11 files)

The game will automatically detect and use them!
`;

async function main() {
  console.log('🎵 Checking audio setup...\n');

  const musicDir = path.join(process.cwd(), 'public/audio/music');
  const sfxDir = path.join(process.cwd(), 'public/audio/sfx');

  // Create directories
  fs.mkdirSync(musicDir, { recursive: true });
  fs.mkdirSync(sfxDir, { recursive: true });

  const hasFFmpeg = await checkFFmpeg();

  if (!hasFFmpeg) {
    console.log('⚠️  ffmpeg not found - cannot generate placeholder audio\n');
    console.log(AUDIO_GUIDE);

    // Save guide to file
    fs.writeFileSync(
      path.join(process.cwd(), 'public/audio/DOWNLOAD_GUIDE.txt'),
      AUDIO_GUIDE
    );
    console.log('\n📄 Download guide saved to: public/audio/DOWNLOAD_GUIDE.txt\n');
    return;
  }

  console.log('✅ ffmpeg found - generating placeholder beeps...\n');
  console.log('Note: These are simple placeholder tones.');
  console.log('Replace with real audio from the download guide for better experience.\n');

  // Generate simple tones using ffmpeg
  const sounds = [
    // Music (longer, lower frequency)
    { file: 'public/audio/music/lobby.mp3', freq: 440, duration: 30, desc: 'Lobby music' },
    { file: 'public/audio/music/shop.mp3', freq: 523, duration: 30, desc: 'Shop music' },
    { file: 'public/audio/music/race.mp3', freq: 659, duration: 30, desc: 'Race music' },

    // SFX (short, varied frequencies)
    { file: 'public/audio/sfx/button_click.mp3', freq: 800, duration: 0.1, desc: 'Button click' },
    { file: 'public/audio/sfx/purchase.mp3', freq: 1000, duration: 0.3, desc: 'Purchase' },
    { file: 'public/audio/sfx/sell.mp3', freq: 900, duration: 0.3, desc: 'Sell' },
    { file: 'public/audio/sfx/bet_place.mp3', freq: 700, duration: 0.2, desc: 'Bet place' },
    { file: 'public/audio/sfx/race_start.mp3', freq: 1200, duration: 0.5, desc: 'Race start' },
    { file: 'public/audio/sfx/race_finish.mp3', freq: 1400, duration: 0.5, desc: 'Race finish' },
    { file: 'public/audio/sfx/stumble.mp3', freq: 300, duration: 0.3, desc: 'Stumble' },
    { file: 'public/audio/sfx/surge.mp3', freq: 1600, duration: 0.4, desc: 'Surge' },
    { file: 'public/audio/sfx/victory.mp3', freq: 1800, duration: 0.6, desc: 'Victory' },
    { file: 'public/audio/sfx/defeat.mp3', freq: 250, duration: 0.5, desc: 'Defeat' },
    { file: 'public/audio/sfx/ready_up.mp3', freq: 1100, duration: 0.2, desc: 'Ready up' },
  ];

  for (const sound of sounds) {
    try {
      const cmd = `ffmpeg -f lavfi -i "sine=frequency=${sound.freq}:duration=${sound.duration}" -y "${sound.file}" 2>&1`;
      await execAsync(cmd);
      console.log(`✅ Generated: ${sound.desc}`);
    } catch (error) {
      console.log(`⚠️  Failed to generate: ${sound.desc}`);
    }
  }

  console.log('\n✨ Placeholder audio generated!\n');
  console.log('⚠️  IMPORTANT: These are simple beeps for testing only.');
  console.log('   For a better experience, download real audio files.\n');

  fs.writeFileSync(
    path.join(process.cwd(), 'public/audio/DOWNLOAD_GUIDE.txt'),
    AUDIO_GUIDE
  );
  console.log('📄 Download guide saved to: public/audio/DOWNLOAD_GUIDE.txt\n');
}

main().catch(console.error);
