#!/usr/bin/env python3
"""build.py — assembles index.html from src/base.html and src/modules/*.html"""

import os
import re

MODULES_DIR = os.path.join(os.path.dirname(__file__), 'src', 'modules')
BASE_HTML   = os.path.join(os.path.dirname(__file__), 'src', 'base.html')
OUTPUT      = os.path.join(os.path.dirname(__file__), 'index.html')


def parse_module(filepath):
    """Return (num, nav_title, lesson_div_html) for a module file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()

    # Parse metadata comment: <!-- module: num="N" nav="Title" -->
    meta = re.match(r'<!-- module: num="(\d+)" nav="([^"]+)" -->\n', text)
    if not meta:
        raise ValueError(f'Missing metadata comment in {filepath}')

    num = int(meta.group(1))
    nav = meta.group(2)
    lesson_html = text[meta.end():]

    return num, nav, lesson_html


def build():
    # Collect modules sorted alphabetically (= by number since filenames are zero-padded)
    filenames = sorted(
        f for f in os.listdir(MODULES_DIR) if f.endswith('.html')
    )

    modules = []
    for fname in filenames:
        path = os.path.join(MODULES_DIR, fname)
        num, nav, lesson_html = parse_module(path)
        modules.append((num, nav, lesson_html))

    total = len(modules)

    # Build sidebar nav HTML
    nav_parts = []
    for i, (num, nav_title, _) in enumerate(modules):
        active_class = ' active' if i == 0 else ''
        num_str = f'{num:02d}'
        nav_parts.append(
            f'    <button class="nav-item{active_class}" onclick="goTo({num})" id="nav-{num}">\n'
            f'      <span class="nav-dot"></span>\n'
            f'      <span class="nav-num">{num_str}</span>\n'
            f'      <span>{nav_title}</span>\n'
            f'    </button>'
        )
    nav_html = '\n\n'.join(nav_parts)

    # Build content HTML — strip trailing newline from each lesson block
    content_parts = []
    for num, nav_title, lesson_html in modules:
        content_parts.append(lesson_html.rstrip('\n'))
    content_html = '\n\n'.join(content_parts)

    # Read base template
    with open(BASE_HTML, 'r', encoding='utf-8') as f:
        base = f.read()

    # Replace placeholders
    result = base
    result = result.replace('<!-- BUILD:NAV -->', nav_html)
    result = result.replace('<!-- BUILD:CONTENT -->', content_html)
    result = result.replace('<!-- BUILD:SUBTITLE -->', f'{total} módulos · do zero')
    result = result.replace('<!-- BUILD:TOTAL -->', str(total))

    # Write output
    with open(OUTPUT, 'w', encoding='utf-8') as f:
        f.write(result)

    print(f'✓ index.html gerado com {total} módulos')


if __name__ == '__main__':
    build()
