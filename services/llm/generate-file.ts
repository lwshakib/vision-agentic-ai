import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { s3Service } from '@/services/s3.services';

export type GeneratedFileType = 'pdf' | 'csv' | 'json' | 'markdown';

export interface GenerateFileOptions {
  fileName: string;
  type: GeneratedFileType;
  content: string;
}

/**
 * Standalone File Generation logic (PDF, CSV, JSON, Markdown).
 */
export async function generateFile(options: GenerateFileOptions) {
  const { fileName, type, content } = options;

  const normalizedContent =
    typeof content === 'string' ? content : JSON.stringify(content, null, 2);

  const safeFileName = fileName || 'generated-file';
  const safeType = type || 'pdf';
  const extension = safeType === 'markdown' ? 'md' : safeType;
  const fullFileName = safeFileName.endsWith(`.${extension}`)
    ? safeFileName
    : `${safeFileName}.${extension}`;

  try {
    let buffer: Buffer;

    switch (safeType) {
      case 'pdf': {
        const doc = new jsPDF();
        const margin = 15;
        const lineHeight = 6;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const maxLineWidth = pageWidth - margin * 2;
        let cursorY = margin + 5;

        const lines = normalizedContent.split('\n');
        let i = 0;
        while (i < lines.length) {
          const line = lines[i].trim();

          if (
            line.startsWith('|') &&
            i + 1 < lines.length &&
            lines[i + 1].includes('---')
          ) {
            const tableLines: string[] = [];
            while (i < lines.length && lines[i].trim().startsWith('|')) {
              tableLines.push(lines[i].trim());
              i++;
            }

            if (tableLines.length >= 2) {
              const headers = tableLines[0]
                .split('|')
                .filter((cell) => cell.trim() !== '')
                .map((cell) => cell.trim());

              const rows = tableLines.slice(2).map((rowLine) =>
                rowLine
                  .split('|')
                  .filter((cell) => cell.trim() !== '')
                  .map((cell) => cell.trim()),
              );

              autoTable(doc, {
                head: [headers],
                body: rows,
                startY: cursorY,
                margin: { left: margin, right: margin },
                theme: 'striped',
                styles: { fontSize: 9 },
                headStyles: { fillColor: [41, 128, 185] },
              });

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              cursorY = (doc as any).lastAutoTable.finalY + 10;
              continue;
            }
          }

          if (!line) {
            cursorY += lineHeight;
            i++;
            continue;
          }

          // Handle Horizontal Rule
          if (line.match(/^---+$/) || line.match(/^\*\*\*+$/)) {
            doc.setLineWidth(0.2);
            doc.line(margin, cursorY - 2, pageWidth - margin, cursorY - 2);
            cursorY += lineHeight;
            i++;
            continue;
          }

          let isHeader = false;
          let headerLevel = 0;
          let textToRender = line;

          // Handle Headers
          const headerMatch = textToRender.match(/^(#{1,6})\s+(.*)$/);
          if (headerMatch) {
            isHeader = true;
            headerLevel = headerMatch[1].length;
            textToRender = headerMatch[2];
          }

          // Handle Basic Lists
          const isList = textToRender.match(/^[-*]\s+(.*)$/);
          let indentX = margin;
          if (isList) {
            textToRender = '• ' + isList[1];
            indentX = margin + 5;
          }

          let fontSize = 10;
          let isBold = false;

          if (isHeader) {
            fontSize = 20 - headerLevel * 2;
            fontSize = Math.max(10, fontSize);
            isBold = true;
            cursorY += 4;
          }

          doc.setFontSize(fontSize);
          doc.setFont('helvetica', isBold ? 'bold' : 'normal');

          const wrappedLines = doc.splitTextToSize(
            textToRender,
            maxLineWidth - (indentX - margin),
          );

          for (const wLine of wrappedLines) {
            if (cursorY + lineHeight > pageHeight - margin) {
              doc.addPage();
              cursorY = margin + 5;
            }

            if (isHeader) {
              const cleanHeader = wLine.replace(/\*|_/g, '');
              doc.text(cleanHeader, indentX, cursorY);
            } else {
              const parts = wLine.split(/(\*\*.*?\*\*|__.*?__|\*.*?\*)/g);
              let currentX = indentX;
              for (const part of parts) {
                if (!part) continue;

                if (
                  (part.startsWith('**') && part.endsWith('**')) ||
                  (part.startsWith('__') && part.endsWith('__'))
                ) {
                  doc.setFont('helvetica', 'bold');
                  const text = part.slice(2, -2);
                  doc.text(text, currentX, cursorY);
                  currentX += doc.getTextWidth(text);
                } else if (
                  part.startsWith('*') &&
                  part.endsWith('*') &&
                  part.length > 2
                ) {
                  doc.setFont('helvetica', 'italic');
                  const text = part.slice(1, -1);
                  doc.text(text, currentX, cursorY);
                  currentX += doc.getTextWidth(text);
                } else {
                  doc.setFont('helvetica', 'normal');
                  doc.text(part, currentX, cursorY);
                  currentX += doc.getTextWidth(part);
                }
              }
            }

            cursorY += lineHeight * (fontSize / 10);
          }

          if (isHeader) {
            cursorY += 2;
          }
          i++;
        }

        buffer = Buffer.from(doc.output('arraybuffer'));
        break;
      }
      default:
        buffer = Buffer.from(normalizedContent, 'utf-8');
    }

    const contentTypeMap: Record<string, string> = {
      pdf: 'application/pdf',
      csv: 'text/csv',
      json: 'application/json',
      markdown: 'text/markdown',
    };
    const contentType =
      contentTypeMap[safeType] || 'application/octet-stream';

    const url = await s3Service.uploadFile(
      buffer,
      `files/${fullFileName}`,
      contentType,
    );

    return {
      success: true,
      url,
      fileName: fullFileName,
    };
  } catch (error) {
    console.error('[llm:generateFile] Error:', error);
    throw error;
  }
}
