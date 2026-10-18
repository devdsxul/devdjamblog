"""Re-download the poster pool used by compose.py.

Posters are the English Wikipedia page image (infobox poster) for each title, which is the
canonical artwork for the film. They are non-free publicity images: this pool is a local art
project, not a redistributable asset. `pilicense=any` is required — the API defaults to free
images only, which silently returns nothing for every film poster.

    python fetch.py            # resolve + download whatever is missing
    python compose.py           # rebuild assets/img/poster-wall/giallo-wall.jpg
"""
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
UA = "DevdjamPosterCollage/1.0 (personal art project)"
API = "https://en.wikipedia.org/w/api.php"

TITLES = [
    "The Bird with the Crystal Plumage", "The Cat o' Nine Tails", "Four Flies on Grey Velvet",
    "Deep Red", "Suspiria", "Inferno (1980 film)", "Tenebrae (film)", "Phenomena (film)",
    "Opera (1987 film)", "Blood and Black Lace", "The Girl Who Knew Too Much (1963 film)",
    "Don't Torture a Duckling", "The New York Ripper", "Zombi 2", "The Beyond (1981 film)",
    "City of the Living Dead", "The House by the Cemetery",
    "Your Vice Is a Locked Room and Only I Have the Key", "Strip Nude for Your Killer",
    "Torso (1973 film)", "What Have You Done to Solange?", "The Strange Vice of Mrs. Wardh",
    "A Lizard in a Woman's Skin", "The Psychic (film)", "The Black Belly of the Tarantula",
    "The Texas Chain Saw Massacre", "The Evil Dead", "Evil Dead II", "Re-Animator",
    "Street Trash", "Basket Case (film)", "Brain Damage (film)", "Braindead (film)", "Bad Taste",
    "The Toxic Avenger", "Class of Nuke 'Em High", "Frankenhooker", "Maniac (1980 film)",
    "Pieces (film)", "Anthropophagus", "Burial Ground (film)", "Cannibal Ferox", "Nekromantik",
    "Eraserhead", "El Topo", "Santa Sangre", "Pink Flamingos", "Female Trouble",
    "Tetsuo: The Iron Man", "Videodrome", "They Live", "The Stuff (film)", "Society (film)",
    "From Beyond (film)", "Night of the Living Dead", "Dawn of the Dead (1978 film)",
    "Day of the Dead (1985 film)", "Ms .45", "The Driller Killer", "The Last House on the Left",
    "The Burning (film)", "Sleepaway Camp", "Black Christmas (1974 film)",
    "The Slumber Party Massacre", "Blood Feast", "Two Thousand Maniacs!", "The Wizard of Gore",
    "Faster, Pussycat! Kill! Kill!", "Beyond the Valley of the Dolls", "Switchblade Sisters",
    "House (1977 film)", "The Wicker Man", "Possession (1981 film)", "Angst (1983 film)",
    "Henry: Portrait of a Serial Killer",
]

# Pages whose infobox sits under a different lemma.
ALT = {
    "Deep Red": ["Profondo Rosso"],
    "Phenomena": ["Phenomena (1985 film)"],
    "The Psychic": ["Sette note in nero"],
    "The Burning": ["The Burning (1981 film)"],
}


def get(url, binary=False):
    """GET with the backoff Wikipedia demands (429 is common when batching)."""
    for attempt in range(5):
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=45) as r:
                return r.read() if binary else json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code in (429, 503):
                time.sleep(min(30, 5 * 2 ** attempt))
                continue
            raise
        except Exception:
            time.sleep(min(30, 5 * 2 ** attempt))
    return None


def resolve(titles):
    out = []
    for i in range(0, len(titles), 12):
        batch = titles[i:i + 12]
        url = f"{API}?action=query&format=json&formatversion=2&prop=pageimages" \
              f"&piprop=original%7Cthumbnail&pithumbsize=760&pilicense=any&redirects=1&titles=" \
              f"{urllib.parse.quote('|'.join(batch))}"
        data = get(url)
        if not data or "query" not in data:
            continue
        for page in data["query"]["pages"]:
            src = page.get("original") or page.get("thumbnail")
            if src:
                out.append({"title": page["title"], "url": src["source"]})
        time.sleep(1.8)
    return out


def main():
    manifest_path = HERE / "manifest.json"
    manifest = json.loads(manifest_path.read_text("utf-8")) if manifest_path.exists() else []
    have = {m["title"] for m in manifest}

    missing = [t for t in TITLES if t not in have]
    if missing:
        manifest += resolve(missing)
        manifest_path.write_text(json.dumps(manifest, indent=2), "utf-8")
        print(f"resolved {len(missing)} new titles")

    for i, m in enumerate(manifest, 1):
        slug = "".join(c if c.isalnum() else "-" for c in m["title"]).strip("-").lower()
        dest = HERE / f"{i:02d}-{slug}.jpg"
        if dest.exists():
            continue
        blob = get(m["url"], binary=True)
        if blob:
            dest.write_bytes(blob)
            print(f"  ok  {m['title']}")
        else:
            print(f"  miss {m['title']}")
        time.sleep(0.3)

    for label, alts in ALT.items():
        dest = HERE / f"x-{label.lower().replace(' ', '-')}.jpg"
        if dest.exists():
            continue
        for lemma in alts:
            found = resolve([lemma])
            if found:
                blob = get(found[0]["url"], binary=True)
                if blob:
                    dest.write_bytes(blob)
                    print(f"  ok  {label} <- {lemma}")
                    break
            time.sleep(1.5)

    print(f"pool: {len(list(HERE.glob('*.jpg'))) - 1} posters")


if __name__ == "__main__":
    main()
