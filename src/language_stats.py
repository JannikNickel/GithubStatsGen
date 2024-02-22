from data import *
from dataclasses import dataclass
from collections import defaultdict
import drawsvg as draw

@dataclass
class LangStatsListLayout:
    width: int = 350
    left_margin: int = 25
    right_spacing: int = 75
    bottom_margin: int = 20
    header_offset: int = 35
    content_offset: int = 30
    lang_entry_height: int = 40
    bar_entry_offset: int = 10
    bar_entry_height: int = 8
    perc_text_spacing: int = 8

@dataclass
class LangStatsCompLayout:
    width: int = 530
    left_margin: int = 25
    right_margin: int = 25
    bottom_margin: int = 25
    header_offset: int = 35
    content_offset: int = 25
    bar_height: int = 10
    label_inital_offset: int = 25
    label_offset: int = 25
    lang_dot_radius: int = 5

def gen_lang_card(data: UserData, theme_css: str, lang_colors: dict[str, str], lang_limit: int, compact: bool) -> draw.Drawing:
    langs = calc_language_ratios(data)
    lang_limit = min(lang_limit, len(langs))
    if compact:
        return draw_svg_comp(langs, LangStatsCompLayout(), theme_css, lang_colors, lang_limit)
    else:
        return draw_svg_list(langs, LangStatsListLayout(), theme_css, lang_colors, lang_limit)

def calc_language_ratios(data: UserData) -> dict[str, float]:
    lang_bytes = defaultdict(int)
    for repo in data.repos:
        for lang, bytes in repo.langs.items():
            lang_bytes[lang] += bytes
    total_bytes = float(sum(b for b in lang_bytes.values()))
    lang_list = [(l, b / total_bytes) for l, b in lang_bytes.items()]
    return sorted(lang_list, key = lambda n: n[1], reverse = True)

def get_lang_data(langs: list[tuple[str, float]], lang_colors: dict[str, str], lang_limit: int, index: int) -> tuple[str, str]:
    name, p = langs[index]
    color = lang_colors.get(name, "") or "#CACDD3"
    if index == lang_limit - 1 and len(langs) > lang_limit:
        name = "Other"
        color = "#999999"
        p = sum(perc for _, perc in langs[index:])
    return name, color, p

def draw_header(title: str, x: int, y: int) -> draw.Text:
    return draw.Text(
        text = title,
        font_size = 0,
        x = x,
        y = y,
        class_ = "header")

def draw_svg_comp(langs: list[tuple[str, float]], layout: LangStatsCompLayout, theme_css: str, lang_colors: dict[str, str], lang_limit: int) -> draw.Drawing:
    height = layout.header_offset
    header = draw_header("Most Used Languages", layout.left_margin, height)

    bg_width = layout.width - layout.left_margin - layout.right_margin
    height += layout.content_offset
    lang_group = draw.Group(transform = f"translate({layout.left_margin}, {height})")
    mask = draw.Mask(
        id = "mask",
        x = 0,
        y = 0,
        width = bg_width,
        height = layout.bar_height,
        rx = 3
    )
    lang_group.append(mask)
    mask.append(draw.Rectangle(
        x = 0,
        y = 0,
        width = bg_width,
        height =  layout.bar_height,
        rx = 3,
        fill = "white"))
    
    l_off = 0
    y_off = layout.label_inital_offset + layout.bar_height
    for i in range(lang_limit):
        name, color, p = get_lang_data(langs, lang_colors, lang_limit, i)

        l_width = bg_width * p
        lang_group.append(draw.Rectangle(
            x = l_off,
            y = 0,
            width = l_width,
            height = layout.bar_height,
            fill = color,
            mask = "url(#mask)"))
        l_off += l_width
        
        x_off = (layout.width - layout.left_margin) * 0.5 if (i % 2 != 0) else 0
        lang_group.append(draw.Circle(
            cx = x_off + layout.lang_dot_radius,
            cy = y_off - layout.lang_dot_radius,
            r = layout.lang_dot_radius,
            fill = color))
        lang_group.append(draw.Text(
            text = f"{name} <tspan opacity=\"0.7\">({round(p * 100, 2)}%)</tspan>",
            font_size = 0,
            x = x_off + layout.lang_dot_radius * 3,
            y = y_off,
            class_ = "language-label"))
        if i % 2 != 0:
            y_off += layout.label_offset
    
    height += y_off
    if lang_limit % 2 == 0:
        height -= layout.label_offset
    height += layout.bottom_margin

    background = draw.Rectangle(
        x = 0.5,
        y = 0.5,
        rx = 5,
        ry = 5,
        height = height - 1,
        width = layout.width - 1,
        stroke_opacity = 1,
        class_ = "background")
    
    svg = draw.Drawing(layout.width, height)
    svg.append_css(theme_css)
    svg.append(background)
    svg.append(header)
    svg.append(lang_group)

    return svg

def draw_svg_list(langs: list[tuple[str, float]], layout: LangStatsListLayout, theme_css: str, lang_colors: dict[str, str], lang_limit: int) -> draw.Drawing:
    height = layout.header_offset
    header = draw_header("Most Used Languages", layout.left_margin, height)
    
    row_off = 0
    height += layout.content_offset
    lang_group = draw.Group(transform = f"translate({layout.left_margin}, {height})")
    for i in range(lang_limit):
        name, color, p = get_lang_data(langs, lang_colors, lang_limit, i)

        row_group = draw.Group(transform = f"translate({0}, {row_off})")
        row_off += layout.lang_entry_height

        row_group.append(draw.Text(
            text = name,
            font_size = 0,
            x = 2,
            y = 0,
            class_ = "language-label"))
        
        bg_width = layout.width - layout.left_margin - layout.right_spacing
        row_group.append(draw.Rectangle(
            x = 2,
            y = layout.bar_entry_offset,
            rx = 3,
            ry = 3,
            width = bg_width,
            height = layout.bar_entry_height,
            fill = "#DDDDDD"))
        
        row_group.append(draw.Rectangle(
            x = 2,
            y = layout.bar_entry_offset,
            rx = 3,
            ry = 3,
            width = p * bg_width,
            height = layout.bar_entry_height,
            fill = color))

        row_group.append(draw.Text(
            text = f"{round(p * 100, 2)}%",
            font_size = 0,
            x = 2 + bg_width + layout.perc_text_spacing,
            y = layout.bar_entry_offset + 5.25,
            dominant_baseline = "middle",
            class_ = "language-label"))
        
        lang_group.append(row_group)

    height += row_off - layout.lang_entry_height * 0.5
    height += layout.bottom_margin

    background = draw.Rectangle(
        x = 0.5,
        y = 0.5,
        rx = 5,
        ry = 5,
        height = height - 1,
        width = layout.width - 1,
        stroke_opacity = 1,
        class_ = "background")
    
    svg = draw.Drawing(layout.width, height)
    svg.append_css(theme_css)
    svg.append(background)
    svg.append(header)
    svg.append(lang_group)

    return svg
