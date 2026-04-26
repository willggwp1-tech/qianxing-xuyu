// =====================================================
// LevelSelectScene.js
// Phaser 3 scene for level selection.
//
// Animation approach:
//   - lottie-web renders the star animation in a DOM div
//     that sits BEHIND the transparent Phaser canvas.
//   - Step 1: play level_select.json once (intro).
//   - Step 2: play level_select2.json in a pingpong loop.
//
// Hitbox approach:
//   - An invisible Phaser rectangle sits over the star.
//   - Clicking it navigates to chapter1.html.
// =====================================================

// ===== ADJUSTABLE HITBOX PARAMETERS =====
// Coordinates are in the game's native 1920×1080 space.
let hitboxX      = 250;   // horizontal center of the star
let hitboxY      = 350;   // vertical center of the star
let hitboxWidth  = 300;   // width of the clickable area
let hitboxHeight = 300;   // height of the clickable area
// =========================================

class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LevelSelectScene' });
  }

  // No preload needed — lottie-web fetches its own JSON files.

  create() {
    // Start the lottie animation sequence in the DOM layer.
    this.startLottieSequence();

    // Create the invisible Phaser hitbox on top.
    this.createHitbox();
  }

  startLottieSequence() {
    // The div#lottie-container is declared in level_select.html.
    // It sits behind the transparent Phaser canvas.
    const container = document.getElementById('lottie-container');

    // Step 1: play the intro animation once.
    const introAnim = lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: false,
      autoplay: true,
      path: 'assets/background/level_select.json',
    });

    // Step 2: when intro finishes, switch to the pingpong loop.
    introAnim.addEventListener('complete', () => {
      introAnim.destroy();

      const loopAnim = lottie.loadAnimation({
        container,
        renderer: 'svg',
        loop: false,     // we manage looping manually for pingpong
        autoplay: true,
        path: 'assets/background/level_select2.json',
      });

      // Pingpong: flip direction every time the animation completes.
      let forward = true;
      loopAnim.addEventListener('complete', () => {
        forward = !forward;
        loopAnim.setDirection(forward ? 1 : -1);
        loopAnim.play();
      });
    });
  }

  createHitbox() {
    // Invisible rectangle placed over the star.
    const hitbox = this.add.rectangle(
      hitboxX, hitboxY,
      hitboxWidth, hitboxHeight
    );

    // 0 alpha = fully invisible, but still interactive.
    hitbox.setFillStyle(0xffffff, 0);
    hitbox.setInteractive({ useHandCursor: true });

    // Navigate to chapter1 on click.
    hitbox.on('pointerdown', () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => {
        window.location.href = 'chapter1.html';
      });
    });
  }
}
