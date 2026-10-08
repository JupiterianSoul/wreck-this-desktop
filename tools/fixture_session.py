import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "host"))
name, out = sys.argv[1], Path(sys.argv[2])
os.environ["WTD_FIXTURE"] = str(ROOT / "tests" / "fixtures" / name)
os.environ["WTD_QUIET"] = "1"
import capture

out.mkdir(parents=True, exist_ok=True)
data = capture.capture(out)
fm = next(m for m in data["monitors"] if m["focused"])
w = capture.wallpaper(out, fm)
print(w or "")
