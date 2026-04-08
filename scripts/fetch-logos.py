import json
import os
import time
import sys
import ssl
import gzip
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

# Configuration
OUTPUT_DIR = 'public/logos/svg'
MANIFEST_PATH = 'src/data/logo-manifest.json'
COMPANIES_FILE = 'src/data/companies-list.json'
BRANDFETCH_CID = '1idmK3o9tc0K-RvrDZU'

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs('src/data', exist_ok=True)

def fetch_url_bytes(url, headers=None):
    """Fetch raw bytes."""
    if headers is None:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36', 
            'Accept': 'image/svg+xml,image/*,*/*'
        }
    
    # Bypass SSL verification
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    req = Request(url, headers=headers)
    try:
        with urlopen(req, timeout=10, context=ctx) as response:
            content = response.read()
            # Handle Gzip
            if response.info().get('Content-Encoding') == 'gzip':
                content = gzip.decompress(content)
            return content
    except HTTPError as e:
        sys.stderr.write(f"    HTTP Error {e.code}: {url}\n")
    except URLError as e:
        sys.stderr.write(f"    URL Error {e.reason}: {url}\n")
    except Exception as e:
        sys.stderr.write(f"    Error: {e}\n")
    return None

def normalize_svg(svg_bytes):
    """Simple normalization to use currentColor."""
    if not svg_bytes: return None
    try:
        content = svg_bytes.decode('utf-8')
        # Replace black/hex fills with currentColor
        content = content.replace('fill="#000000"', 'fill="currentColor"')
        content = content.replace('fill="#000"', 'fill="currentColor"')
        return content.encode('utf-8')
    except:
        return svg_bytes 

def fetch_simple_icons(slug):
    """Fetch from Simple Icons CDN."""
    url = f"https://cdn.jsdelivr.net/npm/simple-icons@v14.0.0/icons/{slug}.svg"
    return fetch_url_bytes(url)

def fetch_brandfetch_cdn(domain):
    """Fetch from Brandfetch CDN to save locally."""
    # Try forcing SVG via format param? 
    # Brandfetch docs say: /search/:brand?c=... returns JSON. 
    # /:domain?c=... returns image.
    url = f"https://cdn.brandfetch.io/{domain}?c={BRANDFETCH_CID}"
    return fetch_url_bytes(url)

def main():
    if not os.path.exists(COMPANIES_FILE):
        print(f"Error: {COMPANIES_FILE} not found.")
        return

    with open(COMPANIES_FILE, 'r') as f:
        companies = json.load(f)

    manifest = {}
    if os.path.exists(MANIFEST_PATH):
        try:
            with open(MANIFEST_PATH, 'r') as f:
                manifest = json.load(f)
        except: pass

    # Domain mapping for Brandfetch fallback
    # Keys must match normalized slugs from generate-companies-list.js
    domain_map = {
        'nordnet': 'nordnet.dk',
        'nordnet-bank': 'nordnet.dk',
        'novonordisk': 'novonordisk.com',
        'danskebank': 'danskebank.com',
        'carlsberg': 'carlsberg.com',
        'maersk': 'maersk.com',
        'orsted': 'orsted.com',
        'nordea': 'nordea.com',
        'ishares': 'ishares.com',
        'sparindex': 'sparindex.dk',
        'apple': 'apple.com', 
        'microsoft': 'microsoft.com'
    }
    
    simple_icons_aliases = {
        'nordnet': ['nordnet', 'nordnetbank'],
        'nordnet-bank': ['nordnet', 'nordnetbank'],
        'ishares': ['ishares', 'blackrock'], 
        'microsoft': ['microsoft', 'windows'],
        'google': ['google', 'alphabet'],
        'maersk': ['maersk', 'apmllermrsk'] # Try alternate simple icons slug just in case
    }

    print(f"Processing {len(companies)} companies...")

    for company in companies:
        slug = company['slug']
        name = company['name']
        print(f"Fetching: {name} ({slug})...")
        
        content = None
        source = None
        file_ext = 'svg'

        # 1. Try Simple Icons
        if not source:
            simple_slugs = simple_icons_aliases.get(slug, [slug.replace('-', '').replace(' ', '').replace('.', '')])
            for try_slug in simple_slugs:
                content = fetch_simple_icons(try_slug)
                # Check for SVG signature
                if content and b"<svg" in content:
                    source = 'simple-icons'
                    break
        
        # 2. Try Brandfetch CDN (Build-time download)
        if not source:
            domain = domain_map.get(slug)
            if domain:
                bf_content = fetch_brandfetch_cdn(domain)
                if bf_content:
                    header = bf_content[:50]
                    if b"<svg" in bf_content or b"<?xml" in header:
                        content = bf_content
                        source = 'brandfetch-local'
                        file_ext = 'svg'
                        sys.stderr.write(f"  [Brandfetch] Found SVG for {domain}\n")
                    elif b"PNG" in header:
                        content = bf_content
                        source = 'brandfetch-local'
                        file_ext = 'png'
                        sys.stderr.write(f"  [Brandfetch] Found PNG for {domain}\n")
                    elif b"JFIF" in header or b"Exif" in header:
                        content = bf_content
                        source = 'brandfetch-local'
                        file_ext = 'jpg'
                        sys.stderr.write(f"  [Brandfetch] Found JPEG for {domain}\n")
                    elif b"WEBP" in header and b"RIFF" in header:
                        content = bf_content
                        source = 'brandfetch-local'
                        file_ext = 'webp'
                        sys.stderr.write(f"  [Brandfetch] Found WebP for {domain}\n")
                    else:
                        sys.stderr.write(f"  [Brandfetch] Unknown format for {domain}: {repr(header)}\n")

        entry = {
            "displayName": name,
            "exists": False,
            "path": None,
            "source": None
        }

        if source and content:
            if file_ext == 'svg':
                content = normalize_svg(content)
            
            filename = f"{slug}.{file_ext}"
            filepath = os.path.join(OUTPUT_DIR, filename)
            
            with open(filepath, 'wb') as f:
                f.write(content)
            
            entry["exists"] = True
            entry["path"] = f"/logos/svg/{filename}"
            entry["source"] = source
            print(f"  -> Found via {source} ({file_ext})")
        else:
            print(f"  -> Not found")
            
        manifest[slug] = entry
        time.sleep(0.5)

    with open(MANIFEST_PATH, 'w') as f:
        json.dump(manifest, f, indent=2)
    print(f"\nDone! Manifest saved to {MANIFEST_PATH}")

if __name__ == "__main__":
    main()
