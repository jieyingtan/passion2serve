import { readFileSync } from "node:fs";
import { join } from "node:path";

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const TEMPLATE_WIDTH = 1685;
const TEMPLATE_HEIGHT = 1191;

function pdfEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[^\x20-\x7e]/g, "?");
}

function fittedSize(value: string, preferred: number, minimum: number, maximumWidth: number) {
  const estimatedWidth = value.length * preferred * 0.56;
  return estimatedWidth <= maximumWidth
    ? preferred
    : Math.max(minimum, Math.floor(preferred * maximumWidth / estimatedWidth));
}

function certificateText(value: string, y: number, preferredSize: number, minimumSize = 10, font = "F1") {
  const left = 285;
  const right = 765;
  const size = fittedSize(value, preferredSize, minimumSize, right - left);
  const estimatedWidth = value.length * size * 0.56;
  const x = left + Math.max(0, (right - left - estimatedWidth) / 2);
  return `BT /${font} ${size} Tf 0.08 0.16 0.29 rg 1 0 0 1 ${x.toFixed(1)} ${y} Tm (${pdfEscape(value)}) Tj ET`;
}

function buildPdf(objects: Buffer[]) {
  const chunks: Buffer[] = [Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", "binary")];
  const offsets = [0];
  let byteLength = chunks[0].length;

  objects.forEach((object, index) => {
    offsets[index + 1] = byteLength;
    const prefix = Buffer.from(`${index + 1} 0 obj\n`);
    const suffix = Buffer.from("\nendobj\n");
    chunks.push(prefix, object, suffix);
    byteLength += prefix.length + object.length + suffix.length;
  });

  const xrefOffset = byteLength;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    xref += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  chunks.push(Buffer.from(xref));
  return Buffer.concat(chunks);
}

export function buildCertificatePdf(input: { participantName: string; eventName: string; eventDate: string; certificateNumber: string }) {
  const template = readFileSync(join(process.cwd(), "public", "certificates", "passion2serve-certificate-template-v2.jpg"));
  const stream = [
    `q ${PAGE_WIDTH} 0 0 ${PAGE_HEIGHT} 0 0 cm /Im1 Do Q`,
    // Remove the source template's event/date placeholders before drawing the
    // participant-specific values. The recipient line and gold rule remain.
    "q 1 1 1 rg 285 188 480 58 re f Q",
    certificateText(input.participantName, 276, 27, 16, "F2"),
    certificateText(`For participating in the ${input.eventName}`, 220, 13, 10, "F1"),
    certificateText(`on ${input.eventDate}.`, 199, 13, 10, "F1"),
    certificateText(`Certificate No. ${input.certificateNumber}`, 31, 8, 7, "F1"),
  ].join("\n");
  const streamBuffer = Buffer.from(stream);

  return buildPdf([
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> /XObject << /Im1 7 0 R >> >> /Contents 4 0 R >>`),
    Buffer.concat([Buffer.from(`<< /Length ${streamBuffer.length} >>\nstream\n`), streamBuffer, Buffer.from("\nendstream")]),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"),
    Buffer.concat([
      Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${TEMPLATE_WIDTH} /Height ${TEMPLATE_HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${template.length} >>\nstream\n`),
      template,
      Buffer.from("\nendstream"),
    ]),
  ]);
}
