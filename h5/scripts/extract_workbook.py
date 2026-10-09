"""Read-only extraction. Run from any directory; never writes the source XLSX."""
import json
from pathlib import Path
import openpyxl

root = Path(__file__).resolve().parents[1]
source = root.parent / 'data' / '天地劫伤害模拟计算表新.xlsx'
workbook = openpyxl.load_workbook(source)
cached = openpyxl.load_workbook(source, data_only=True)
result = {'sheets': {}, 'names': {n: d.attr_text for n, d in workbook.defined_names.items()}, 'cached': {}}
for sheet in workbook:
    if sheet.title == '映射表':
        continue
    cells = {}
    for row in sheet:
        for cell in row:
            if cell.value is None:
                continue
            if sheet.title == '工作台1' and (cell.column > 22 or cell.row > 51):
                continue
            if isinstance(cell.value, openpyxl.worksheet.formula.ArrayFormula):
                continue
            cells[cell.coordinate] = cell.value
    result['sheets'][sheet.title] = cells
for name in ['工作台1', '排行计算1']:
    result['cached'][name] = {c.coordinate: cached[name][c.coordinate].value
                             for row in workbook[name] for c in row
                             if c.data_type == 'f' and c.coordinate in result['sheets'][name]}
target = root / 'dist' / 'workbook.json'
target.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f'Extracted {len(result["sheets"])} sheets to {target}')
