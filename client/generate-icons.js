const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#006565';
  ctx.fillRect(0, 0, size, size);

  // Text
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.floor(size * 0.35)}px sans-serif`;
  ctx.fillText('SP', size / 2, size / 2);

  return canvas.toBuffer('image/png');
}

const publicDir = path.join(__dirname, 'public');

fs.writeFileSync(path.join(publicDir, 'icon-192.png'), generateIcon(192));
console.log('Generated icon-192.png');

fs.writeFileSync(path.join(publicDir, 'icon-512.png'), generateIcon(512));
console.log('Generated icon-512.png');
