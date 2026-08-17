"""
生成柬企海外商务工具小程序的 TabBar 图标
- 未选中态：灰色 #999999
- 选中态：吴哥金 #B8860B
微信标准尺寸：81x81
"""
from PIL import Image, ImageDraw

SIZE = 81
COLOR_INACTIVE = (153, 153, 153)
COLOR_ACTIVE = (184, 134, 11)
BG = (255, 255, 255, 0)  # 透明背景


def make_icon(name, color):
    """创建带透明背景的图标"""
    img = Image.new('RGBA', (SIZE, SIZE), BG)
    d = ImageDraw.Draw(img)

    if name == 'home':
        # 房子：屋顶三角 + 房身方块 + 门
        d.polygon([(15, 38), (40, 14), (65, 38)], fill=color)
        d.rectangle([(20, 38), (60, 65)], outline=color, width=4)
        d.rectangle([(34, 48), (46, 65)], fill=color)
    elif name == 'tax':
        # 税务：算盘/计算器方块 + 显示屏
        # 计算器外框
        d.rounded_rectangle([(18, 14), (62, 68)], radius=4, outline=color, width=3)
        # 显示屏
        d.rectangle([(24, 18), (56, 30)], fill=color)
        # 3x3 按钮网格
        for i, x in enumerate([24, 38, 52]):
            for j, y in enumerate([34, 46, 58]):
                d.rounded_rectangle([(x, y), (x + 8, y + 8)], radius=1, fill=color)
    elif name == 'compliance':
        # 合规：盾牌 + 文档
        # 盾牌外形
        d.polygon([(40, 12), (20, 22), (20, 46), (40, 70), (60, 46), (60, 22)], fill=color)
        # 内部对勾
        d.line([(30, 40), (38, 50), (54, 28)], fill=(255, 255, 255), width=4)
    elif name == 'profile':
        # 个人：头 + 肩
        d.ellipse([(28, 14), (54, 40)], fill=color)
        d.pieslice([(15, 40), (66, 80)], 180, 360, fill=color)

    return img


# 创建 images 目录
import os
img_dir = 'D:/ZIEC/JCXLFW/cambodia-biz-travel/miniprogram/images'
os.makedirs(img_dir, exist_ok=True)

icons = ['home', 'tax', 'compliance', 'profile']
for name in icons:
    # 未选中（灰）
    make_icon(name, COLOR_INACTIVE).save(f'{img_dir}/tab-{name}.png')
    # 选中（金）
    make_icon(name, COLOR_ACTIVE).save(f'{img_dir}/tab-{name}-active.png')

# 清理旧的 travel/order 图标
for old in ['travel', 'order']:
    for suffix in ['', '-active']:
        path = f'{img_dir}/tab-{old}{suffix}.png'
        if os.path.exists(path):
            os.remove(path)

print('生成完成：')
for f in sorted(os.listdir(img_dir)):
    path = os.path.join(img_dir, f)
    size = os.path.getsize(path)
    print(f'  {f}  ({size} bytes)')