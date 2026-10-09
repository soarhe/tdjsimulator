"""Build a self-contained HTML and ZIP from the same sources as the web app."""
import json
import re
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
dist = root / 'dist'
output = root / 'releases'
output.mkdir(exist_ok=True)

def replace_once(text, old, new):
    if text.count(old) != 1:
        raise ValueError(f'Source changed; expected exactly one occurrence: {old[:80]}')
    return text.replace(old, new, 1)

html = (dist / 'index.html').read_text(encoding='utf-8')
css = (dist / 'style.css').read_text(encoding='utf-8')
engine = (dist / 'engine.mjs').read_text(encoding='utf-8')
app = (dist / 'app.mjs').read_text(encoding='utf-8')
data = json.loads((dist / 'workbook.json').read_text(encoding='utf-8'))
# The saved Excel results are test fixtures, not runtime inputs.
data.pop('cached', None)
serialized = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
engine = re.sub(r'^export ', '', engine, flags=re.MULTILINE)
app = replace_once(app, "import {Engine} from './engine.mjs';", '')
app = replace_once(app,
    "const response=await fetch('./workbook.json');if(!response.ok)throw Error('数据文件读取失败');data=await response.json();",
    "data=JSON.parse(document.getElementById('embedded-workbook').textContent);")
html = replace_once(html, '<link rel="stylesheet" href="style.css">', '<style>' + css + '</style>')
html = replace_once(html, '<script type="module" src="app.mjs"></script>', '')
code = '(async () => {\n"use strict";\n' + engine + '\n' + app + '\n})();'
code = re.sub(r'</script', r'<\\/script', code, flags=re.IGNORECASE)
html = replace_once(html, '</body>',
    '<script id="embedded-workbook" type="application/json">' + serialized + '</script>\n'
    '<script>' + code + '</script>\n</body>')
assert not re.search(r'<(?:script|link)[^>]+(?:src|href)=["\'](?!data:)', html)
assert "fetch(" not in code and "import " not in code

name = '天地劫伤害模拟器-离线版'
target = output / f'{name}.html'
target.write_text(html, encoding='utf-8')
instructions = '''天地劫伤害模拟器 · 离线版

使用方法
1. 先解压此 ZIP 压缩包。
2. 用 Chrome、Edge、Safari 等现代浏览器打开“天地劫伤害模拟器-离线版.html”。
3. 选择双方角色、配装或修改技能参数，即可计算。

不需要安装 Excel、Python、Node.js，不需要启动本地服务，也不需要联网。
所有角色数据、公式、样式均已包含在 HTML 内，单独分享这个 HTML 也可以使用。
配置只在当前页面生效；刷新或重新打开会恢复初始值。

默认使用 Excel 原式；右上角可切换修正版（自动克制、D 类免伤去重、等血量判击杀）。
两种口径与现有 H5 保持一致，未额外更改计算规则。

手机的聊天软件或文件预览器可能不执行 HTML 中的脚本。
如无法操作，请下载并解压后使用支持本地 HTML 的浏览器打开，或在电脑上打开。
'''
archive = output / f'{name}.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    z.write(target, f'{name}/{target.name}')
    z.writestr(f'{name}/使用说明.txt', instructions)
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert z.read(f'{name}/{target.name}').decode('utf-8') == html
print(f'HTML: {target} ({target.stat().st_size:,} bytes)')
print(f'ZIP:  {archive} ({archive.stat().st_size:,} bytes)')
