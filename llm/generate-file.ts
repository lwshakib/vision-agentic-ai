import { saveFileToCloudinary } from '@/lib/cloudinary';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Types of files that can be generated.
 */
export type GeneratedFileType = 'pdf' | 'csv' | 'json' | 'markdown';

/**
 * Options for generating a file.
 */
export interface GenerateFileOptions {
  /** The name of the file (without extension if type is provided). */
  fileName: string;
  /** The type of file to generate. */
  type: GeneratedFileType;
  /** The content of the file. */
  content: string;
}

/**
 * Result of the file generation.
 */
export interface GenerateFileResult {
  success: boolean;
  /** The URL of the generated file on Cloudinary. */
  url?: string;
  /** The name of the file. */
  fileName: string;
  /** The public ID on Cloudinary. */
  publicId?: string;
  /** Error message if success is false. */
  error?: string;
}

/**
 * Generates a file based on provided content and type, then uploads it to Cloudinary.
 */
export async function generateFile(
  options: GenerateFileOptions
): Promise<GenerateFileResult> {
  const { fileName, type, content } = options;
  
  // Ensure content is a string. If the LLM passes an object (common for JSON requests), stringify it.
  const normalizedContent = typeof content === 'string' 
    ? content 
    : JSON.stringify(content, null, 2);
  
  // Defensive checks to prevent "Cannot read properties of undefined"
  if (!fileName) {
    console.warn('[GENERATE_FILE] Missing fileName, using default.');
  }
  
  const safeFileName = fileName || 'generated-file';
  const safeType = type || 'pdf';
  const fullFileName = safeFileName.endsWith(`.${safeType}`) ? safeFileName : `${safeFileName}.${safeType}`;

  try {
    let buffer: Buffer;

    switch (safeType) {
      case 'pdf': {
        const doc = new jsPDF();
        const bodyFontSize = 10;
        const headerFontSize = 14;
        const margin = 15;
        const lineHeight = 6;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const maxLineWidth = pageWidth - margin * 2;

        let cursorY = margin + 5;

        // Split content into blocks (paragraphs or tables)
        // This is a simple parser to identify tables
        const lines = normalizedContent.split('\n');
        let i = 0;
        while (i < lines.length) {
          const line = lines[i].trim();

          // 1. Handle Tables
          if (line.startsWith('|') && i + 1 < lines.length && lines[i + 1].includes('---')) {
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
              
              // Skip the separator line (| --- | --- |)
              const rows = tableLines.slice(2).map((rowLine) =>
                rowLine
                  .split('|')
                  .filter((cell) => cell.trim() !== '')
                  .map((cell) => cell.trim())
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

              const lastAutoTable = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable;
              cursorY = lastAutoTable.finalY + 10;
              continue;
            }
          }

          // 2. Handle Headers
          if (line.startsWith('#')) {
            const level = (line.match(/^#+/) || [''])[0].length;
            const text = line.replace(/^#+\s*/, '');
            doc.setFontSize(headerFontSize - (level - 1) * 2);
            doc.setFont('helvetica', 'bold');
            
            const wrappedHeader = doc.splitTextToSize(text, maxLineWidth);
            for (const hLine of wrappedHeader) {
              if (cursorY + 10 > pageHeight - margin) {
                doc.addPage();
                cursorY = margin + 5;
              }
              doc.text(hLine, margin, cursorY);
              cursorY += lineHeight + 2;
            }
            cursorY += 2;
            i++;
            continue;
          }

          // 3. Handle Bullet Points
          if (line.match(/^[\-\*\+]\s+/)) {
            doc.setFontSize(bodyFontSize);
            doc.setFont('helvetica', 'normal');
            const text = line.replace(/^[\-\*\+]\s+/, '');
            const bullet = '•';
            const bulletMargin = margin + 5;
            const textMargin = bulletMargin + 5;
            const listLineWidth = pageWidth - textMargin - margin;

            const wrappedLines = doc.splitTextToSize(text, listLineWidth);
            
            if (cursorY + lineHeight > pageHeight - margin) {
              doc.addPage();
              cursorY = margin + 5;
            }

            doc.text(bullet, bulletMargin, cursorY);
            
            for (let j = 0; j < wrappedLines.length; j++) {
              if (cursorY + lineHeight > pageHeight - margin) {
                doc.addPage();
                cursorY = margin + 5;
              }
              doc.text(wrappedLines[j], textMargin, cursorY);
              cursorY += lineHeight;
            }
            i++;
            continue;
          }

          // 4. Handle Regular Text (with basic Bold support)
          if (line === '') {
            cursorY += 4;
            i++;
            continue;
          }

          doc.setFontSize(bodyFontSize);
          doc.setFont('helvetica', 'normal');

          // Simple bold detection: if whole line is **text**, make it bold.
          // Otherwise just strip ** for now and print normal.
          let textToPrint = line;
          if (line.startsWith('**') && line.endsWith('**')) {
            doc.setFont('helvetica', 'bold');
            textToPrint = line.replace(/^\*\*|\*\*$/g, '');
          } else {
            textToPrint = line.replace(/\*\*/g, ''); // Strip bold markers
          }

          const wrappedLines = doc.splitTextToSize(textToPrint, maxLineWidth);
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

        const arrayBuffer = doc.output('arraybuffer');
        buffer = Buffer.from(arrayBuffer);
        break;
      }
      case 'csv':
      case 'json':
      case 'markdown': {
        buffer = Buffer.from(normalizedContent, 'utf-8');
        break;
      }
      default:
        throw new Error(`Unsupported file type: ${safeType}`);
    }

    const uploadResult = await saveFileToCloudinary(buffer, fullFileName, safeType);

    return {
      success: true,
      url: uploadResult.url,
      fileName: fullFileName,
      publicId: uploadResult.publicId,
    };
  } catch (error) {
    console.error('[GENERATE_FILE_EXCEPTION]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during file generation',
      fileName: fullFileName,
    };
  }
}
