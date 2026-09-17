"""Build uploadable theme/plugin ZIPs and a server bundle without local data."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
dist = root / 'dist'
dist.mkdir(exist_ok=True)

def archive(output, sources):
    with ZipFile(dist / output, 'w', ZIP_DEFLATED) as z:
        for source, base in sources:
            paths = sorted(source.rglob('*')) if source.is_dir() else [source]
            for file in paths:
                if file.is_file():
                    z.write(file, str(base / file.relative_to(source)) if source.is_dir() else str(base))
    with ZipFile(dist / output) as z:
        assert z.testzip() is None
        assert all('.runtime/' not in name and 'node_modules/' not in name and not name.endswith('/.env') for name in z.namelist())
        print(f'{output}: {len(z.namelist())} files, {(dist / output).stat().st_size:,} bytes')

archive('devdjam-theme.zip', [(root / 'wp-content/themes/devdjam', Path('devdjam'))])
archive('devdjam-core.zip', [(root / 'wp-content/plugins/devdjam-core', Path('devdjam-core'))])
archive('devdjam-server.zip', [
    (root / 'wp-content', Path('wp-content')),
    (root / 'deploy', Path('deploy')),
    (root / 'compose.yaml', Path('compose.yaml')),
    (root / '.env.example', Path('.env.example')),
    (root / 'README.md', Path('README.md')),
    (root / 'docs/OWNER-GUIDE.md', Path('docs/OWNER-GUIDE.md')),
    (root / 'docs/DEPLOYMENT.md', Path('docs/DEPLOYMENT.md')),
    (root / 'docs/ASSETS.md', Path('docs/ASSETS.md')),
])
