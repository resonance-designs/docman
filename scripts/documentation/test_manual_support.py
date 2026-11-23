import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from manual_support import release_metadata, missing_case_headings


class ManualSupportTests(unittest.TestCase):
    def test_source_metadata_uses_package_and_git(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'package.json').write_text('{"version":"3.0.2"}')
            with patch('manual_support.subprocess.check_output', side_effect=['abc123\n', ' M changed\n']):
                metadata = release_metadata(root)
            self.assertEqual(metadata['version'], '3.0.2')
            self.assertEqual(metadata['revision'], 'abc123 plus working-tree changes')
            with patch('manual_support.subprocess.check_output', side_effect=['def456\n', '']):
                self.assertEqual(release_metadata(root)['revision'], 'def456')

    def test_prose_id_reference_does_not_count_as_heading(self):
        rows = [{'case_id': 'ENV-01', 'title': 'Healthy application'}, {'case_id': 'SEC-02', 'title': 'Access \u2014 denied'}]
        self.assertEqual(missing_case_headings(rows, ['See ENV-01 and SEC-02 in the appendix.']), ['ENV-01', 'SEC-02'])
        self.assertEqual(missing_case_headings(rows, ['ENV-01 - Healthy\n application', 'SEC-02 - Access - denied']), [])
        self.assertEqual(missing_case_headings(rows, ['ENV-01 - Wrong title']), ['ENV-01', 'SEC-02'])


if __name__ == '__main__': unittest.main()
