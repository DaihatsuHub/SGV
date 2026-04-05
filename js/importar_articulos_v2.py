"""
IMPORTAR ARTÍCULOS desde DBF a Supabase — REEMPLAZO TOTAL
Borra todo y reimporta limpio desde el DBF.

Requiere: pip install dbfread requests
Uso: python importar_articulos_v2.py
Colocar ARTICULO.DBF en la misma carpeta.
"""
import sys
import requests
from dbfread import DBF, FieldParser

SB_URL = 'https://blwxnrzrsgxscmsquwlz.supabase.co'
SB_KEY = 'sb_publishable_ClOenbz_NYB1iAPn0VqOAw_Fe6RTlGR'
H = {'apikey':SB_KEY,'Authorization':f'Bearer {SB_KEY}','Content-Type':'application/json'}

class LP(FieldParser):
    def parseN(self, field, data):
        try:
            data=data.strip().replace(b',',b'.')
            return 0 if not data or data==b'.' else float(data)
        except: return 0

print("Leyendo ARTICULO.DBF...")
try:
    records = list(DBF('ARTICULO.DBF', encoding='latin-1', parserclass=LP, ignore_missing_memofile=True))
    print(f"✅ {len(records)} artículos leídos")
except FileNotFoundError:
    print("❌ No se encontró ARTICULO.DBF"); sys.exit(1)

print(f"\n⚠️  Se BORRARÁN todos los artículos de Supabase y se reemplazarán con los {len(records)} del DBF.")
if input("¿Continuar? (s/n): ").strip().lower() != 's':
    print("Cancelado."); sys.exit(0)

print("\nBorrando artículos en Supabase...")
r = requests.delete(f'{SB_URL}/rest/v1/articulos?art_cod=neq.___NADA___', headers={**H,'Prefer':'return=minimal'})
print(f"✅ Borrado OK" if r.ok else f"❌ Error {r.status_code}: {r.text[:150]}")
if not r.ok: sys.exit(1)

def conv(rec):
    return {
        'art_cod':  (rec.get('ART_COD') or '').strip(),
        'art_des':  (rec.get('ART_DES') or '').strip(),
        'art_marca':(rec.get('ART_MAR') or '').strip() or None,
        'art_rub':  (rec.get('ART_RUB') or '').strip() or None,
        'art_srub': (rec.get('ART_SRUB') or '').strip() or None,
        'art_pre':  float(rec.get('ART_PRE') or 0),
        'art_stk':  int(rec.get('ART_STK') or 0),
        'art_stkt': int(rec.get('ART_STKT') or 0),
        'art_act':  (rec.get('ART_ACT') or 'S').strip(),
        'art_estu': (rec.get('ART_ESTU') or '').strip() or None,
        'art_grup': (rec.get('ART_GRUP') or '').strip() or None,
        'art_sex':  (rec.get('ART_SEX') or '').strip() or None,
        'art_prov': (rec.get('ART_PROV') or '').strip() or None,
        'codcasio': (rec.get('CODCASIO') or '').strip() or None,
    }

rows = [conv(r) for r in records if (r.get('ART_COD') or '').strip()]
print(f"\n✅ {len(rows)} artículos preparados\nImportando...")

ok=err=0
for i in range(0, len(rows), 500):
    batch=rows[i:i+500]; lote=i//500+1
    r=requests.post(f'{SB_URL}/rest/v1/articulos', headers={**H,'Prefer':'return=minimal'}, json=batch, timeout=30)
    if r.ok: ok+=len(batch); print(f"  Lote {lote}: ✅ {ok}/{len(rows)}")
    else: err+=len(batch); print(f"  Lote {lote}: ❌ {r.status_code} {r.text[:100]}")

print(f"\n{'='*40}\n✅ Importados: {ok}" + (f"\n❌ Errores: {err}" if err else ""))
print("¡Listo! Recargá el sistema.")
