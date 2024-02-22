from data import *
from dataclasses import dataclass
from dateutil import tz
import calendar
import drawsvg as draw

@dataclass
class CommitStatsLayout:
    width: int = 530
    left_margin: int = 25
    right_margin: int = 30
    top_margin: int = 35
    bottom_margin: int = 20
    content_top_offset: int = 35
    bar_left_offset: int = 210
    bar_entry_offset: int = 30
    bar_entry_left_offset: int = 0
    bar_entry_height: int = 12
    bar_perc_left_offset: int = 60

def gen_time_card(data: UserData, timezone: str, theme_css: str) -> draw.Drawing:
    times = adjust_times(data, timezone)
    groups = group_times(times)
    title = time_card_title(groups)
    return draw_svg(title, [
        ("🌅 Morning", groups[1]),
        ("☀️ Daytime", groups[2]),
        ("🌇 Evening", groups[3]),
        ("🌙 Night", groups[0]),
    ], CommitStatsLayout(), theme_css)

def gen_day_card(data: UserData, timezone: str, theme_css: str) -> draw.Drawing:
    times = adjust_times(data, timezone)
    groups = group_days(times)
    title = f"📅 I'm most productive on {calendar.day_name[max(enumerate(groups), key = lambda n: n[1])[0]]}!"
    return draw_svg(title, [(calendar.day_name[i], value) for i, value in enumerate(groups)], CommitStatsLayout(), theme_css)

def adjust_times(data: UserData, timezone: str) -> list[datetime]:
    from_zone = tz.gettz("UTC")
    to_zone = tz.gettz(timezone)
    return [c.date.replace(tzinfo = from_zone).astimezone(to_zone) for repo in data.repos for c in repo.commits]

def group_times(times: list[datetime]) -> tuple[int, int, int, int]:
    refs = [6, 12, 18, 24]
    amount = [0, 0, 0, 0]
    for time in times:
        for i, ref in enumerate(refs):
            if time.hour < ref:
                amount[i] += 1
                break
    return tuple(amount)

def group_days(times: list[datetime]) -> tuple[int, int, int, int, int, int, int]:
    amount = [i for i in range(7)]
    for time in times:
        amount[time.weekday()] += 1
    return tuple(amount)

def time_card_title(time_groups: tuple[int, int, int, int]) -> str:
    highest, _ = max(enumerate(time_groups), key = lambda n: n[1])
    match highest:
        case 0 | 1: return "I'm an early 🐦"
        case 2 | 3: return "I'm a night 🦉"

def draw_svg(title: str, rows: list[tuple[str, int]], layout: CommitStatsLayout, theme_css: str) -> draw.Drawing:
    group_sum = float(sum(r[1] for r in rows))
    height = 0.0

    height += layout.top_margin
    header = draw.Text(
        text = title,
        font_size = 0,
        x = layout.left_margin,
        y = height,
        class_ = "header")
    
    row_off = 0
    height += layout.content_top_offset
    time_group = draw.Group(transform = f"translate({layout.left_margin}, {height})")
    for key, val in rows:
        p = val / group_sum
        row_group = draw.Group(transform = f"translate({layout.bar_entry_left_offset}, {row_off})")
        row_off += layout.bar_entry_offset

        row_group.append(draw.Text(
            text = key,
            font_size = 0,
            x = 0,
            y = 0,
            class_ = "label"))
            
        row_group.append(draw.Text(
            text = f"{val} commits",
            font_size = 0,
            x = layout.bar_left_offset - 10,
            y = 0,
            text_anchor = "end",
            class_ = "label"))

        bg_width = layout.width - layout.left_margin - layout.bar_left_offset - layout.right_margin - layout.bar_perc_left_offset
        row_group.append(draw.Rectangle(
            x = layout.bar_left_offset,
            y = -10,
            rx = 3,
            ry = 3,
            width = bg_width,
            height = layout.bar_entry_height,
            class_ = "progress-bar-bg"))
        
        row_group.append(draw.Rectangle(
            x = layout.bar_left_offset,
            y = -10,
            rx = 3,
            ry = 3,
            width = p * bg_width,
            height = layout.bar_entry_height,
            class_ = "progress-bar-fill"))

        row_group.append(draw.Text(
            text = f"{round(p * 100, 2)}%",
            font_size = 0,
            x = layout.bar_left_offset + bg_width + layout.bar_perc_left_offset,
            y = 0,
            text_anchor = "end",
            class_ = "label"))

        time_group.append(row_group)

    height += row_off - layout.bar_entry_offset + layout.bar_entry_height * 0.5
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
    svg.append(time_group)

    return svg
