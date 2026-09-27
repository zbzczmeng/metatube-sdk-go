import math
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def make_gradient(width, height, start_color, mid_color, end_color):
    """Creates a 3-stop left-to-right linear gradient."""
    grad = Image.new("RGBA", (width, height))
    for x in range(width):
        t = x / max(1, width - 1)
        if t <= 0.5:
            local_t = t * 2.0
            r = int(start_color[0] + (mid_color[0] - start_color[0]) * local_t)
            g = int(start_color[1] + (mid_color[1] - start_color[1]) * local_t)
            b = int(start_color[2] + (mid_color[2] - start_color[2]) * local_t)
        else:
            local_t = (t - 0.5) * 2.0
            r = int(mid_color[0] + (end_color[0] - mid_color[0]) * local_t)
            g = int(mid_color[1] + (end_color[1] - mid_color[1]) * local_t)
            b = int(mid_color[2] + (end_color[2] - mid_color[2]) * local_t)
        for y in range(height):
            grad.putpixel((x, y), (r, g, b, 255))
    return grad

def create_icon():
    # 2x supersampling for ultra crisp edges
    scale = 2
    size = 512 * scale
    radius = 110 * scale

    # Base image with transparency
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Background squircle / rounded rect matching theme (#0b0f19 / #0f172a / #1a1635)
    # Background gradient: deep slate navy into deep violet
    bg_grad = Image.new("RGBA", (size, size))
    for y in range(size):
        t = y / size
        # Top-to-bottom subtle gradient: #111a2e to #0b0f19
        r = int(17 * (1 - t) + 11 * t)
        g = int(26 * (1 - t) + 15 * t)
        b = int(46 * (1 - t) + 25 * t)
        for x in range(size):
            # Diagonal gradient shift with violet accent
            diag = (x + y) / (size * 2)
            vr = int(r + 15 * diag)
            vg = int(g + 8 * (1 - diag))
            vb = int(b + 30 * diag)
            bg_grad.putpixel((x, y), (min(255, vr), min(255, vg), min(255, vb), 255))

    # Mask for rounded rectangle
    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    margin = 16 * scale
    mask_draw.rounded_rectangle([margin, margin, size - margin, size - margin], radius=radius, fill=255)

    # Composite background with mask
    img.paste(bg_grad, (0, 0), mask)

    # 2. Subtle glowing border (#7c3aed / violet accent)
    border_draw = ImageDraw.Draw(img)
    border_color = (124, 58, 237, 180) # violet-600
    border_width = 3 * scale
    border_draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=radius,
        outline=border_color,
        width=border_width
    )

    # Inner subtle glow line
    inner_border_color = (167, 139, 250, 70) # violet-400
    border_draw.rounded_rectangle(
        [margin + border_width, margin + border_width, size - margin - border_width, size - margin - border_width],
        radius=radius - border_width,
        outline=inner_border_color,
        width=1 * scale
    )

    # 3. Text "MetaTube"
    # Choose font
    font_path = "C:/Windows/Fonts/segoeuib.ttf"
    if not os.path.exists(font_path):
        font_path = "C:/Windows/Fonts/arialbd.ttf"
    
    font_size = 90 * scale
    font = ImageFont.truetype(font_path, font_size)

    text = "MetaTube"

    # Calculate text bounding box
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    text_x = (size - text_w) // 2
    # Adjust optical vertical center
    text_y = (size - text_h) // 2 - bbox[1] - (8 * scale)

    # Left-to-right gradient colors for text (High contrast against dark theme):
    # Left: Cyan (#38bdf8) -> Mid: Electric Violet (#c084fc) -> Right: Neon Coral/Pink (#fb7185)
    c_start = (56, 189, 248)  # #38bdf8 Bright Sky Cyan
    c_mid = (192, 132, 252)   # #c084fc Electric Purple
    c_end = (251, 113, 133)   # #fb7185 Rose Pink

    # Text mask
    text_mask = Image.new("L", (size, size), 0)
    text_mask_draw = ImageDraw.Draw(text_mask)
    text_mask_draw.text((text_x, text_y), text, font=font, fill=255)

    # Text subtle drop shadow / glow
    shadow_mask = text_mask.filter(ImageFilter.GaussianBlur(8 * scale))
    shadow_layer = Image.new("RGBA", (size, size), (124, 58, 237, 120))
    img.paste(shadow_layer, (0, 3 * scale), shadow_mask)

    # Generate left-to-right gradient image
    text_grad = make_gradient(size, size, c_start, c_mid, c_end)

    # Paste gradient text onto icon
    img.paste(text_grad, (0, 0), text_mask)

    # Downsample to 512x512
    final_img = img.resize((512, 512), Image.Resampling.LANCZOS)

    # Save to desktop/build/appicon.png
    out_png = "desktop/build/appicon.png"
    final_img.save(out_png, "PNG")
    print(f"Saved PNG to {out_png}")

    # Also save as multi-resolution icon .ico
    out_ico = "desktop/build/windows/icon.ico"
    final_img.save(out_ico, format="ICO", sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)])
    print(f"Saved ICO to {out_ico}")

    # Also save a 64x64 favicon / app logo
    out_icon_64 = "desktop/frontend/dist/icon.png"
    final_img.resize((64, 64), Image.Resampling.LANCZOS).save(out_icon_64, "PNG")
    print(f"Saved 64x64 icon to {out_icon_64}")

if __name__ == "__main__":
    create_icon()
