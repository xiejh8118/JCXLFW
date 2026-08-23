#!/usr/bin/env python3
"""
抠出白底数字人，输出带透明通道的 ai_hub.png。
用法：python scripts/make_ai_hub.py <输入图片> [--output <路径>]
默认输出：miniprogram/images/ai_hub.png
"""
import os
import sys
import argparse
import numpy as np
import cv2
from PIL import Image


def remove_white_background(input_path, output_path, size=None):
    # 用 PIL 读取（兼容中文路径），转为 RGB
    pil_img = Image.open(input_path).convert('RGB')
    img = np.array(pil_img)
    h, w = img.shape[:2]

    # 等比缩放（可选）
    if size:
        scale = min(size / w, size / h)
        new_w, new_h = int(w * scale), int(h * scale)
        img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
        h, w = new_h, new_w

    # 初始化 mask
    mask = np.zeros((h, w), np.uint8)

    # 边界矩形：留 2% 边距，告诉 GrabCut 外部是背景
    pad_x = int(w * 0.02)
    pad_y = int(h * 0.02)
    rect = (pad_x, pad_y, w - 2 * pad_x, h - 2 * pad_y)

    # 背景/前景模型
    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)

    # 运行 GrabCut
    cv2.grabCut(img, mask, rect, bgd_model, fgd_model, iterCount=8, mode=cv2.GC_INIT_WITH_RECT)

    # 0/2 为背景，1/3 为前景
    mask2 = np.where((mask == 2) | (mask == 0), 0, 1).astype('uint8')

    # 生成 RGBA
    rgba = cv2.cvtColor(img, cv2.COLOR_RGB2RGBA)
    rgba[:, :, 3] = mask2 * 255

    # 后处理：基于亮度再次抑制 residual 白边（ Expand foreground slightly then feather ）
    # 计算灰度，背景区域如果很亮（接近 255），降低 alpha
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    # 在 mask 边缘附近做羽化：对当前 mask 做高斯模糊得到 alpha
    alpha = cv2.GaussianBlur(mask2.astype(np.float32) * 255, (5, 5), 0)
    rgba[:, :, 3] = np.clip(alpha, 0, 255).astype(np.uint8)

    # 保存
    out = Image.fromarray(rgba, 'RGBA')
    out.save(output_path, 'PNG')
    print(f'已保存 {output_path} ({w}x{h})')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='抠取数字人 PNG')
    parser.add_argument('input', nargs='?', default=None, help='输入图片路径')
    parser.add_argument('--output', '-o', default='miniprogram/images/ai_hub.png', help='输出路径')
    parser.add_argument('--size', '-s', type=int, default=800, help='长边最大像素')
    args = parser.parse_args()

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(base_dir)

    if not args.input:
        # 默认素材路径
        args.input = r'D:\ObsidianVaults\MyVault\ZIEC运营驾驶舱\03-素材管理\ZIEC LOGO\数字人 定1.png'

    if not os.path.exists(args.input):
        print(f'输入文件不存在: {args.input}')
        sys.exit(1)

    remove_white_background(args.input, args.output, args.size)
