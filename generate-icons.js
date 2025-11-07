const fs = require('fs');
const { createCanvas } = require('canvas');

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // 渐变背景
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // 白色圆角矩形背景
  const padding = size * 0.15;
  const innerSize = size * 0.7;
  const cornerRadius = size * 0.075;
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.beginPath();
  ctx.moveTo(padding + cornerRadius, padding);
  ctx.lineTo(padding + innerSize - cornerRadius, padding);
  ctx.quadraticCurveTo(padding + innerSize, padding, padding + innerSize, padding + cornerRadius);
  ctx.lineTo(padding + innerSize, padding + innerSize - cornerRadius);
  ctx.quadraticCurveTo(padding + innerSize, padding + innerSize, padding + innerSize - cornerRadius, padding + innerSize);
  ctx.lineTo(padding + cornerRadius, padding + innerSize);
  ctx.quadraticCurveTo(padding, padding + innerSize, padding, padding + innerSize - cornerRadius);
  ctx.lineTo(padding, padding + cornerRadius);
  ctx.quadraticCurveTo(padding, padding, padding + cornerRadius, padding);
  ctx.closePath();
  ctx.fill();
  
  // 绘制书本图标
  // 左页
  ctx.fillStyle = '#667eea';
  ctx.beginPath();
  ctx.moveTo(size * 0.3, size * 0.35);
  ctx.lineTo(size * 0.3, size * 0.75);
  ctx.lineTo(size * 0.48, size * 0.7);
  ctx.lineTo(size * 0.48, size * 0.3);
  ctx.closePath();
  ctx.fill();
  
  // 右页
  ctx.fillStyle = '#764ba2';
  ctx.beginPath();
  ctx.moveTo(size * 0.52, size * 0.3);
  ctx.lineTo(size * 0.52, size * 0.7);
  ctx.lineTo(size * 0.7, size * 0.75);
  ctx.lineTo(size * 0.7, size * 0.35);
  ctx.closePath();
  ctx.fill();
  
  // 中线
  ctx.strokeStyle = '#555';
  ctx.lineWidth = size * 0.02;
  ctx.beginPath();
  ctx.moveTo(size * 0.5, size * 0.3);
  ctx.lineTo(size * 0.5, size * 0.7);
  ctx.stroke();
  
  return canvas.toBuffer('image/png');
}

// 生成图标
[16, 48, 128].forEach(size => {
  const buffer = drawIcon(size);
  fs.writeFileSync(`icons/icon${size}.png`, buffer);
  console.log(`✅ 已生成 icon${size}.png`);
});

console.log('\n🎉 所有图标已生成完成！');
