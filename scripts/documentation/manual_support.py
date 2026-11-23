"""Shared build metadata and text normalization for manual generation/verification."""
import json
import subprocess
from datetime import datetime, timezone


def clean(text):
    return text.replace('\u2011', '-').replace('\u2013', '-').replace('\u2014', ' - ').replace('\u2192', ' > ').replace('\u2019', "'")


def release_metadata(root):
    version = json.loads((root / 'package.json').read_text(encoding='utf-8'))['version']
    revision = subprocess.check_output(['git', '-C', str(root), 'rev-parse', 'HEAD'], text=True).strip()
    dirty = bool(subprocess.check_output(['git', '-C', str(root), 'status', '--porcelain'], text=True).strip())
    return {'version': version, 'revision': revision + (' plus working-tree changes' if dirty else ''),
            'date': datetime.now(timezone.utc).strftime('%d %B %Y (UTC)')}


def missing_case_headings(rows, headings):
    normalize = lambda text: ' '.join(clean(text).split())
    actual = {normalize(heading) for heading in headings}
    return [row['case_id'] for row in rows if normalize(f"{row['case_id']} - {row['title']}") not in actual]
