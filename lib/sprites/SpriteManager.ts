import * as PIXI from "pixi.js";

export type HorseVariant =
  | "regular"
  | "pegasus"
  | "unicorn"
  | "zombie"
  | "skeleton"
  | "kelpie";

export type JockeyStyle =
  | "classic"
  | "lightweight"
  | "veteran"
  | "mudder"
  | "royal"
  | "lucky";

export interface SpriteSheet {
  texture: PIXI.Texture;
  frameWidth: number;
  frameHeight: number;
  frames: number;
  framesPerRow: number;
}

export interface CompositeHorseConfig {
  horseType: HorseVariant;
  bloodline?: string; // For tinting (regular horses only)
  jockeyStyle: JockeyStyle;
  jockeyColor?: number; // Optional tint for jockey (team colors)
}

/**
 * Manages sprite loading and composite sprite creation for horses and jockeys
 */
export class SpriteManager {
  private horseSheets: Map<HorseVariant, SpriteSheet> = new Map();
  private jockeySheets: Map<JockeyStyle, SpriteSheet> = new Map();
  private isLoaded = false;

  /**
   * Load a sprite sheet from a path
   */
  private async loadSpriteSheet(
    path: string,
    frameWidth: number = 64,
    frameHeight: number = 64,
    frames: number = 16,
    framesPerRow: number = 4
  ): Promise<SpriteSheet> {
    const texture = await PIXI.Assets.load(path);
    return {
      texture,
      frameWidth,
      frameHeight,
      frames,
      framesPerRow,
    };
  }

  /**
   * Load all sprite assets
   */
  async loadAllAssets(): Promise<void> {
    if (this.isLoaded) return;

    try {
      // Load base horse (tintable)
      this.horseSheets.set(
        "regular",
        await this.loadSpriteSheet(
          "/sprites/horses/base/regular-gallop-sheet.png"
        )
      );

      // Load legendary horses (when available)
      // this.horseSheets.set("pegasus", await this.loadSpriteSheet("/sprites/horses/legendary/pegasus-gallop-sheet.png"));
      // this.horseSheets.set("unicorn", await this.loadSpriteSheet("/sprites/horses/legendary/unicorn-gallop-sheet.png"));
      // this.horseSheets.set("zombie", await this.loadSpriteSheet("/sprites/horses/legendary/zombie-gallop-sheet.png"));
      // this.horseSheets.set("skeleton", await this.loadSpriteSheet("/sprites/horses/legendary/skeleton-gallop-sheet.png"));
      // this.horseSheets.set("kelpie", await this.loadSpriteSheet("/sprites/horses/legendary/kelpie-gallop-sheet.png"));

      // Load jockey overlays (optional - will use fallback if not available)
      try {
        this.jockeySheets.set(
          "classic",
          await this.loadSpriteSheet("/sprites/jockeys/classic-racing-silks.png")
        );
      } catch (error) {
        console.log('[SpriteManager] Jockey sprite not available, will skip jockey layer');
      }

      // Load additional jockey styles (when available)
      // this.jockeySheets.set("lightweight", await this.loadSpriteSheet("/sprites/jockeys/lightweight-outfit.png"));
      // this.jockeySheets.set("veteran", await this.loadSpriteSheet("/sprites/jockeys/veteran-gear.png"));
      // this.jockeySheets.set("mudder", await this.loadSpriteSheet("/sprites/jockeys/mudder-rain-gear.png"));
      // this.jockeySheets.set("royal", await this.loadSpriteSheet("/sprites/jockeys/fancy-royal-outfit.png"));
      // this.jockeySheets.set("lucky", await this.loadSpriteSheet("/sprites/jockeys/lucky-clover-outfit.png"));

      this.isLoaded = true;
    } catch (error) {
      console.error("Failed to load sprite assets:", error);
      throw error;
    }
  }

  /**
   * Get bloodline tint color
   */
  private getBloodlineTint(bloodline: string): number {
    const tints: Record<string, number> = {
      "Northern Storm": 0x6b9bd1,
      "Desert Wind": 0xd4a574,
      "Iron Heart": 0x888888,
      "Wild Card": 0xc94d4d,
      Mudblood: 0x8b6f47,
      "Royal Line": 0xd4af37,
    };
    return tints[bloodline] || 0xffffff;
  }

  /**
   * Create a composite horse sprite (horse + jockey layers)
   */
  createCompositeSprite(config: CompositeHorseConfig): PIXI.Container {
    const container = new PIXI.Container();

    // Get sprite sheets
    const horseSheet = this.horseSheets.get(config.horseType);
    const jockeySheet = this.jockeySheets.get(config.jockeyStyle);

    if (!horseSheet) {
      throw new Error(`Horse sprite sheet not found: ${config.horseType}`);
    }

    // Layer 1: Horse (bottom)
    const horseSprite = new PIXI.Sprite();
    horseSprite.anchor.set(0.5, 0.5);

    // Apply bloodline tint only to regular horses
    if (config.horseType === "regular" && config.bloodline) {
      horseSprite.tint = this.getBloodlineTint(config.bloodline);
    }

    container.addChild(horseSprite);

    // Layer 2: Jockey (top) - if available
    if (jockeySheet) {
      const jockeySprite = new PIXI.Sprite();
      jockeySprite.anchor.set(0.5, 0.5);

      // Optional jockey color tint for teams
      if (config.jockeyColor) {
        jockeySprite.tint = config.jockeyColor;
      }

      container.addChild(jockeySprite);
    }

    return container;
  }

  /**
   * Update a composite sprite to show a specific animation frame
   */
  updateCompositeFrame(
    container: PIXI.Container,
    config: CompositeHorseConfig,
    frameNum: number
  ): void {
    const horseSheet = this.horseSheets.get(config.horseType);
    const jockeySheet = this.jockeySheets.get(config.jockeyStyle);

    if (!horseSheet) return;

    // Calculate frame position in sprite sheet
    const row = Math.floor(frameNum / horseSheet.framesPerRow);
    const col = frameNum % horseSheet.framesPerRow;

    // Update horse sprite (first child)
    const horseSprite = container.children[0] as PIXI.Sprite;
    if (horseSprite) {
      const frameTexture = new PIXI.Texture({
        source: horseSheet.texture.source,
        frame: new PIXI.Rectangle(
          col * horseSheet.frameWidth,
          row * horseSheet.frameHeight,
          horseSheet.frameWidth,
          horseSheet.frameHeight
        ),
      });
      horseSprite.texture = frameTexture;
    }

    // Update jockey sprite (second child) - if available
    if (jockeySheet && container.children[1]) {
      const jockeySprite = container.children[1] as PIXI.Sprite;
      const jockeyFrameTexture = new PIXI.Texture({
        source: jockeySheet.texture.source,
        frame: new PIXI.Rectangle(
          col * jockeySheet.frameWidth,
          row * jockeySheet.frameHeight,
          jockeySheet.frameWidth,
          jockeySheet.frameHeight
        ),
      });
      jockeySprite.texture = jockeyFrameTexture;
    }
  }

  /**
   * Get sprite sheet for a horse type
   */
  getHorseSheet(type: HorseVariant): SpriteSheet | undefined {
    return this.horseSheets.get(type);
  }

  /**
   * Get sprite sheet for a jockey style
   */
  getJockeySheet(style: JockeyStyle): SpriteSheet | undefined {
    return this.jockeySheets.get(style);
  }

  /**
   * Check if assets are loaded
   */
  get loaded(): boolean {
    return this.isLoaded;
  }
}
