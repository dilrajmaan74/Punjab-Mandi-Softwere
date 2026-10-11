const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

function createMandiIcon(width, height, isMaskable = false) {
  const png = new PNG({ width, height });

  const cx = width / 2;
  const cy = height / 2;
  const radius = isMaskable ? width / 2 : width * 0.46;
  const cornerRadius = width * 0.22;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;

      // Rounded rectangle bounds for non-maskable, full bleed for maskable
      let inBounds = true;
      if (!isMaskable) {
        const dx = Math.abs(x - cx);
        const dy = Math.abs(y - cy);
        const halfW = width * 0.46;
        const halfH = height * 0.46;
        const cr = cornerRadius;

        if (dx > halfW || dy > halfH) {
          inBounds = false;
        } else if (dx > halfW - cr && dy > halfH - cr) {
          const cornerDist = Math.hypot(dx - (halfW - cr), dy - (halfH - cr));
          if (cornerDist > cr) {
            inBounds = false;
          }
        }
      }

      if (!inBounds) {
        png.data[idx] = 0;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 0;
        continue;
      }

      // Background Gradient: Emerald dark to Slate dark
      const gradRatio = (x + y) / (width + height);
      // #047857 to #0f172a
      const rBg = Math.floor(4 * (1 - gradRatio) + 15 * gradRatio);
      const gBg = Math.floor(120 * (1 - gradRatio) + 23 * gradRatio);
      const bBg = Math.floor(87 * (1 - gradRatio) + 42 * gradRatio);

      // Gold wheat graphical motif in center
      const nx = (x - cx) / (width * 0.35);
      const ny = (y - cy) / (height * 0.35);

      // Draw stylized wheat grains
      const distCenter = Math.hypot(nx, ny);
      let isGold = false;

      // Central stem
      if (Math.abs(nx) < 0.04 && ny > -0.7 && ny < 0.5) {
        isGold = true;
      }

      // Wheat ears (leaves/grains pairs)
      for (let level = -0.55; level <= 0.35; level += 0.18) {
        const dyGrain = ny - level;
        const sideDist = Math.abs(nx) - (0.18 + Math.abs(level) * 0.05);
        if (Math.hypot(sideDist, dyGrain * 1.5) < 0.13) {
          isGold = true;
        }
      }

      // Base badge bar (weighing scale style)
      if (ny > 0.48 && ny < 0.68 && Math.abs(nx) < 0.65) {
        isGold = true;
      }

      if (isGold) {
        // Gold color #fbbf24
        png.data[idx] = 251;     // R
        png.data[idx + 1] = 191; // G
        png.data[idx + 2] = 36;  // B
        png.data[idx + 3] = 255; // A
      } else {
        png.data[idx] = rBg;
        png.data[idx + 1] = gBg;
        png.data[idx + 2] = bBg;
        png.data[idx + 3] = 255;
      }
    }
  }

  return png;
}

function savePng(filename, png) {
  const filePath = path.join(__dirname, '..', 'public', filename);
  const buffer = PNG.sync.write(png);
  fs.writeFileSync(filePath, buffer);
  console.log(`Saved ${filename} (${buffer.length} bytes)`);
}

// Generate icons
savePng('pwa-192x192.png', createMandiIcon(192, 192, false));
savePng('pwa-512x512.png', createMandiIcon(512, 512, false));
savePng('pwa-maskable-512x512.png', createMandiIcon(512, 512, true));
savePng('apple-touch-icon.png', createMandiIcon(180, 180, false));

console.log('All PWA icons generated successfully!');
