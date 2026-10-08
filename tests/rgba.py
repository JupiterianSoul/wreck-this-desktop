import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert("RGBA")
sys.stdout.buffer.write(im.width.to_bytes(4, "little") + im.height.to_bytes(4, "little") + im.tobytes())
