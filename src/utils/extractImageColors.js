function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}

function colorDistance(c1, c2) {
  return Math.sqrt((c1.r - c2.r) ** 2 + (c1.g - c2.g) ** 2 + (c1.b - c2.b) ** 2);
}

function isNearWhiteOrBlack(r, g, b) {
  const brightness = (r + g + b) / 3;
  return brightness > 240 || brightness < 20;
}

/** Extract dominant colors from an image URL using canvas sampling */
export function extractColorsFromImage(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        const buckets = {};
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 128 || isNearWhiteOrBlack(r, g, b)) continue;
          const key = `${Math.round(r / 32) * 32},${Math.round(g / 32) * 32},${Math.round(b / 32) * 32}`;
          buckets[key] = (buckets[key] || 0) + 1;
        }

        const sorted = Object.entries(buckets)
          .sort((a, b) => b[1] - a[1])
          .map(([key]) => {
            const [r, g, b] = key.split(',').map(Number);
            return { r, g, b, hex: rgbToHex(r, g, b) };
          });

        const distinct = [];
        for (const c of sorted) {
          if (distinct.every((d) => colorDistance(d, c) > 60)) {
            distinct.push(c);
          }
          if (distinct.length >= 4) break;
        }

        if (distinct.length < 2) {
          resolve(null);
          return;
        }

        const byBrightness = [...distinct].sort((a, b) => (a.r + a.g + a.b) - (b.r + b.g + b.b));
        resolve({
          primaryColor: byBrightness[byBrightness.length - 1].hex,
          secondaryColor: byBrightness.length > 1 ? byBrightness[0].hex : byBrightness[0].hex,
        });
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}
