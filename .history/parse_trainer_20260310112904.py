import json, os

def summarize(node, depth=0, max_depth=5):
    indent = '  ' * depth
    t = node.get('type','')
    name = node.get('name','')
    nid = node.get('id','')
    bb = node.get('absoluteBoundingBox') or {}
    w = bb.get('width',''); h = bb.get('height','')
    fills = node.get('fills', [])
    fill_str = ''
    for fill in fills:
        if fill.get('type') == 'SOLID':
            c = fill.get('color', {})
            r=int(c.get('r',0)*255); g=int(c.get('g',0)*255); b=int(c.get('b',0)*255)
            a=fill.get('opacity', c.get('a',1))
            fill_str = f'rgba({r},{g},{b},{round(a,2)})'
    chars = node.get('characters','')
    text_style = node.get('style', {})
    font = text_style.get('fontFamily','')
    font_size = text_style.get('fontSize','')
    font_weight = text_style.get('fontWeight','')
    color_str = ''
    if t == 'TEXT' and fills:
        for fill in fills:
            if fill.get('type') == 'SOLID':
                c = fill.get('color',{})
                r=int(c.get('r',0)*255); g=int(c.get('g',0)*255); b=int(c.get('b',0)*255)
                color_str = f'#{r:02x}{g:02x}{b:02x}'
    info = f'{indent}[{t}] "{name}" id={nid}'
    if w and h: info += f' {int(w)}x{int(h)}'
    if fill_str: info += f' fill={fill_str}'
    if chars: info += f' text="{chars[:80]}"'
    if font: info += f' font={font}/{font_size}px/{font_weight}'
    if color_str: info += f' color={color_str}'
    br = node.get('cornerRadius','')
    if br: info += f' radius={br}'
    result = [info]
    if depth < max_depth:
        for ch in node.get('children', []):
            result.extend(summarize(ch, depth+1, max_depth))
    return result

d = json.load(open(r'C:\Users\Lenar Yolola\OneDrive\Desktop\Figma\figma_trainer_frames.json', encoding='utf-8'))
for frame_id, frame_data in d['nodes'].items():
    doc = frame_data['document']
    lines = summarize(doc, 0, 5)
    safe = doc['name'].replace(' ','_').replace('/','_').replace('&','and').replace(' ','_')
    path = rf'C:\Users\Lenar Yolola\OneDrive\Desktop\Figma\frame_{safe}.txt'
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f'Saved {safe}.txt ({len(lines)} lines)')
