// Image par website ka naam/URL likhta hai (neeche right corner, halke gehre pill me)
export async function addWatermark(blob, text) {
  if (!text) return blob;
  const bmp = await createImageBitmap(blob);
  if (bmp.width < 300) return blob;                         // bohat chhoti image par nahi
  const c = document.createElement("canvas");
  c.width = bmp.width; c.height = bmp.height;
  const g = c.getContext("2d");
  g.drawImage(bmp, 0, 0);
  const fs = Math.max(13, Math.round(c.width * 0.026));
  g.font = `600 ${fs}px "Segoe UI", Roboto, Arial, sans-serif`;
  const tw = g.measureText(text).width, ph = Math.round(fs * 0.6), pv = Math.round(fs * 0.4), m = Math.round(fs * 0.7);
  const bw = tw + ph * 2, bh = fs + pv * 2, x = c.width - bw - m, y = c.height - bh - m;
  g.fillStyle = "rgba(0,0,0,0.55)";
  g.beginPath();
  if (g.roundRect) g.roundRect(x, y, bw, bh, bh / 2); else g.rect(x, y, bw, bh);
  g.fill();
  g.fillStyle = "#fff"; g.textBaseline = "middle";
  g.fillText(text, x + ph, y + bh / 2 + 1);
  return new Promise((res) => c.toBlob((b) => res(b || blob), "image/webp", 0.82));
}