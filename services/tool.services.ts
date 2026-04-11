import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { s3Service } from './s3.services';

export type GeneratedFileType = 'pdf' | 'csv' | 'json' | 'markdown';

export interface GenerateFileOptions {
  fileName: string;
  type: GeneratedFileType;
  content: string;
}

class ToolService {
  /**
   * Generates a file based on content and type, and uploads it to S3/R2.
   * @param options - fileName, type, and content.
   */
  public async generateFile(options: GenerateFileOptions) {
    const { fileName, type, content } = options;

    const normalizedContent =
      typeof content === 'string' ? content : JSON.stringify(content, null, 2);

    const safeFileName = fileName || 'generated-file';
    const safeType = type || 'pdf';
    const fullFileName = safeFileName.endsWith(`.${safeType}`)
      ? safeFileName
      : `${safeFileName}.${safeType}`;

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

                cursorY = (doc as any).lastAutoTable.finalY + 10;
                continue;
              }
            }

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const wrappedLines = doc.splitTextToSize(line, maxLineWidth);
            for (const wLine of wrappedLines) {
              if (cursorY + lineHeight > pageHeight - margin) {
                doc.addPage();
                cursorY = margin + 5;
              }
              doc.text(wLine, margin, cursorY);
              cursorY += lineHeight;
            }
            i++;
          }

          buffer = Buffer.from(doc.output('arraybuffer'));
          break;
        }
        default:
          buffer = Buffer.from(normalizedContent, 'utf-8');
      }

      const uploadUrl = await s3Service.getPresignedUrl(
        `files/${fullFileName}`,
        `application/${safeType}`,
      );
      
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': `application/${safeType}` },
        body: new Uint8Array(buffer),
      });

      return {
        success: true,
        path: `files/${fullFileName}`,
        fileName: fullFileName,
      };
    } catch (error) {
      console.error('[ToolService.generateFile] Error:', error);
      throw error;
    }
  }
}

export const toolService = new ToolService();
