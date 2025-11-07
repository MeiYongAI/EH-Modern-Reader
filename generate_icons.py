from PIL import Image, ImageDraw
import os

def create_icon(size):
    """创建一个简单的书本图标"""
    # 创建图像
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 渐变背景 (使用紫色)
    for i in range(size):
        ratio = i / size
        r = int(102 + (118 - 102) * ratio)
        g = int(126 + (75 - 126) * ratio)
        b = int(234 + (162 - 234) * ratio)
        draw.line([(i, 0), (i, size)], fill=(r, g, b, 255))
    
    # 白色圆角矩形背景
    padding = int(size * 0.15)
    inner_size = int(size * 0.7)
    draw.rounded_rectangle(
        [(padding, padding), (padding + inner_size, padding + inner_size)],
        radius=int(size * 0.075),
        fill=(255, 255, 255, 240)
    )
    
    # 书本左页 (紫色)
    left_page = [
        (int(size * 0.3), int(size * 0.35)),
        (int(size * 0.3), int(size * 0.75)),
        (int(size * 0.48), int(size * 0.7)),
        (int(size * 0.48), int(size * 0.3))
    ]
    draw.polygon(left_page, fill=(102, 126, 234, 255))
    
    # 书本右页 (深紫色)
    right_page = [
        (int(size * 0.52), int(size * 0.3)),
        (int(size * 0.52), int(size * 0.7)),
        (int(size * 0.7), int(size * 0.75)),
        (int(size * 0.7), int(size * 0.35))
    ]
    draw.polygon(right_page, fill=(118, 75, 162, 255))
    
    # 中线
    line_width = max(1, int(size * 0.02))
    draw.line(
        [(int(size * 0.5), int(size * 0.3)), (int(size * 0.5), int(size * 0.7))],
        fill=(85, 85, 85, 255),
        width=line_width
    )
    
    return img

# 生成三种尺寸的图标
sizes = [16, 48, 128]
for size in sizes:
    icon = create_icon(size)
    icon.save(f'icons/icon{size}.png', 'PNG')
    print(f'✓ Generated icon{size}.png')

print('\n✓ All icons generated successfully!')
