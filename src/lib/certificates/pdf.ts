function pdfEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[^\x20-\x7e]/g, "?");
}

export function buildCertificatePdf(input: { participantName: string; eventName: string; eventDate: string; certificateNumber: string }) {
  const lines = [
    { size: 28, y: 520, text: "Certificate of Participation" },
    { size: 14, y: 470, text: "Passion2Serve proudly recognises" },
    { size: 24, y: 420, text: input.participantName },
    { size: 14, y: 370, text: `for completing ${input.eventName}` },
    { size: 12, y: 335, text: input.eventDate },
    { size: 10, y: 80, text: `Certificate ${input.certificateNumber}` },
  ];
  const stream = lines.map((line) => `BT /F1 ${line.size} Tf 1 0 0 1 90 ${line.y} Tm (${pdfEscape(line.text)}) Tj ET`).join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 792 612] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets[index + 1] = Buffer.byteLength(pdf); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}
