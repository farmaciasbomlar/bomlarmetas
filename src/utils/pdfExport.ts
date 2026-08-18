import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

/**
 * Ensures all fonts and images within the target element are fully loaded before rendering.
 */
async function waitForAssets(element: HTMLElement): Promise<void> {
  // 1. Wait for document fonts
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Ignore font loading errors if any font fails
    }
  }

  // 2. Wait for all <img> tags inside element
  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalHeight !== 0) {
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        img.onload = () => resolve(true);
        img.onerror = () => resolve(true);
      });
    })
  );
}

/**
 * Captures an HTML element using html-to-image (toPng) and exports it as a PDF file.
 * If the element contains multiple children with the class `.pdf-page`, each page is
 * captured cleanly without cross-page image slicing or broken borders.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
  backgroundColor = '#0d0d0d'
): Promise<void> {
  try {
    // 1. Check if the element contains explicit page containers (.pdf-page)
    const pageElements = Array.from(element.querySelectorAll('.pdf-page')) as HTMLElement[];

    if (pageElements.length > 0) {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      for (let i = 0; i < pageElements.length; i++) {
        const pageEl = pageElements[i];
        await waitForAssets(pageEl);

        const pageDataUrl = await toPng(pageEl, {
          backgroundColor,
          pixelRatio: 2,
          cacheBust: true,
          style: {
            backgroundColor,
          },
        });

        if (i > 0) {
          pdf.addPage();
        }

        // Render full A4 page (210mm x 297mm)
        pdf.addImage(pageDataUrl, 'PNG', 0, 0, 210, 297);
      }

      pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
      return;
    }

    // 2. Fallback: single element continuous flow
    // Wait for all fonts and images to be completely ready
    await waitForAssets(element);

    // Capture the element using html-to-image
    const dataUrl = await toPng(element, {
      backgroundColor,
      pixelRatio: 2,
      cacheBust: true,
      style: {
        backgroundColor, // Explicitly set background color on container
      },
    });

    // Load image object to obtain real render aspect ratio
    const img = new Image();
    img.src = dataUrl;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    // Create PDF document (A4 portrait)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (img.height * imgWidth) / img.width;

    let heightLeft = imgHeight;
    let position = 0;

    // First page
    pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add subsequent pages if content exceeds single page height
    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  } catch (error) {
    console.error('Erro na exportação de PDF via html-to-image:', error);
    throw error;
  }
}
