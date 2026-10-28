#!/usr/bin/env python3
"""Compare hypotheses, never install an inferred formula into the battle engine."""
import argparse
import json
from decimal import Decimal, ROUND_FLOOR, ROUND_HALF_UP, ROUND_CEILING
from pathlib import Path

def predictions(row):
    d = lambda key: Decimal(str(row[key]))
    base = d('magicalAttack') * d('coefficient')
    outgoing, incoming = d('outgoingBonus'), d('incomingBonus')
    raw = {'multiplicative': base * (1 + outgoing) * (1 + incoming),
           'additive': base * (1 + outgoing + incoming)}
    result = {}
    for formula, amount in raw.items():
        for name, mode in [('floor', ROUND_FLOOR), ('nearest', ROUND_HALF_UP), ('ceil', ROUND_CEILING)]:
            result[f'{formula}:final-{name}'] = int(amount.quantize(Decimal(1), rounding=mode))
    # One alternative staged-rounding hypothesis; not an exhaustive list of game formulas.
    floor = lambda n: n.quantize(Decimal(1), rounding=ROUND_FLOOR)
    result['multiplicative:stage-floor'] = int(floor(floor(floor(base) * (1 + outgoing)) * (1 + incoming)))
    return result

def analyze(rows):
    usable, excluded = [], []
    for row in rows:
        reasons = []
        if not row.get('sourceRef'): reasons.append('missing frame/replay source')
        if row.get('completeModifierAudit') is not True: reasons.append('modifiers not fully audited')
        if row.get('noConcurrentHpEffects') is not True: reasons.append('concurrent HP effects not excluded')
        numeric = ['magicalAttack', 'coefficient', 'outgoingBonus', 'incomingBonus', 'hpBefore', 'hpAfter', 'recoveryCap']
        try:
            values = {k: Decimal(str(row[k])) for k in numeric}
            if any(not n.is_finite() for n in values.values()): raise ValueError()
            if values['magicalAttack'] < 0 or values['coefficient'] < 0 or values['outgoingBonus'] < -1 or values['incomingBonus'] < -1: raise ValueError()
            if not (0 < values['hpBefore'] <= values['hpAfter'] < values['recoveryCap']): reasons.append('capped, dead, or invalid HP observation')
            if any(values[k] != int(values[k]) for k in ['hpBefore', 'hpAfter', 'recoveryCap']): raise ValueError()
        except (KeyError, ValueError, ArithmeticError): reasons.append('missing/invalid numeric input')
        if reasons:
            excluded.append({'id': row.get('id'), 'reasons': reasons}); continue
        observed = int(values['hpAfter'] - values['hpBefore'])
        candidates = predictions(row)
        usable.append({'id': row.get('id'), 'observed': observed, 'predictions': candidates,
                       'consistent': [key for key, amount in candidates.items() if amount == observed]})
    common = set(usable[0]['consistent']) if usable else set()
    for row in usable[1:]: common.intersection_update(row['consistent'])
    return {'status': 'no_usable_samples' if not usable else 'hypotheses_only',
            'consistentHypotheses': sorted(common), 'samples': usable, 'excluded': excluded,
            'warning': '非穷尽假说比较；即使只剩一项也不自动确认公式，不能由合成数据验证游戏规则。'}

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('samples', type=Path)
    args = parser.parse_args()
    data = json.loads(args.samples.read_text())
    print(json.dumps(analyze(data['samples']), ensure_ascii=False, indent=2))
