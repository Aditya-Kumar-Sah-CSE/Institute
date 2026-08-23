/**
 * Certificate Export Engine - Production Grade SVG to High-Res PNG/JPG Rasterizer
 * Designed for Code Arena SDE Certificates
 */

export interface ExportOptions {
  filename?: string;
  format?: 'png' | 'jpeg';
  width?: number;
  height?: number;
  backgroundColor?: string;
}

/**
 * Helper to convert relative or external images inside SVG to Base64 Data URLs
 * to prevent Canvas cross-origin security errors (tainted canvas).
 */
async function inlineSvgImages(svgClone: SVGElement): Promise<void> {
  const images = Array.from(svgClone.querySelectorAll('image'));
  for (const img of images) {
    const href = img.getAttribute('href') || img.getAttribute('xlink:href');
    if (href && !href.startsWith('data:')) {
      try {
        const response = await fetch(href, { mode: 'cors' });
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        img.setAttribute('href', dataUrl);
      } catch (e) {
        console.warn('Could not inline SVG image asset:', href, e);
      }
    }
  }
}

/**
 * Strips continuous CSS animations/keyframes that interfere with canvas snapshotting.
 */
function sanitizeSvgStyles(svgClone: SVGElement): void {
  const styleTags = Array.from(svgClone.querySelectorAll('style'));
  for (const styleTag of styleTags) {
    let css = styleTag.textContent || '';
    css = css.replace(/@keyframes[\s\S]*?\}\s*\}/gi, '');
    css = css.replace(/animation\s*:[^;\}]+;?/gi, '');
    styleTag.textContent = css;
  }
}

export async function downloadSvgAsImage(
  svgElementOrId: SVGSVGElement | string,
  options: ExportOptions = {}
): Promise<boolean> {
  const {
    filename = 'SDE_Battle_Certificate',
    format = 'png',
    width = 1920,
    height = 1080,
    backgroundColor = '#0b0f19',
  } = options;

  let svgElement: SVGSVGElement | null = null;
  if (typeof svgElementOrId === 'string') {
    svgElement = document.getElementById(svgElementOrId) as SVGSVGElement | null;
  } else {
    svgElement = svgElementOrId;
  }

  if (!svgElement) {
    console.error('Certificate SVG element not found for export');
    return false;
  }

  try {
    // 1. Deep clone the SVG element so live DOM remains unchanged
    const clone = svgElement.cloneNode(true) as SVGSVGElement;

    // 2. Set explicit width and height attributes matching 16:9 target resolution
    clone.setAttribute('width', String(width));
    clone.setAttribute('height', String(height));
    if (!clone.getAttribute('xmlns')) {
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }

    // 3. Inline images and sanitize keyframes
    await inlineSvgImages(clone);
    sanitizeSvgStyles(clone);

    // 4. Serialize to SVG XML string
    const svgString = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const URLObj = window.URL || window.webkitURL || window;
    const blobURL = URLObj.createObjectURL(svgBlob);

    // 5. Load SVG blob into HTML Image
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (err) => reject(new Error('SVG rasterization image load failed: ' + err));
      img.src = blobURL;
    });

    // 6. Draw to HTML5 Canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URLObj.revokeObjectURL(blobURL);
      throw new Error('Canvas 2D context unavailable');
    }

    // Fill solid background (prevents transparency artifacts)
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Draw high quality image
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    URLObj.revokeObjectURL(blobURL);

    // 7. Export PNG / JPG Data URL and trigger browser file download
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const extension = format === 'jpeg' ? 'jpg' : 'png';
    const cleanFilename = `${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}_Certificate.${extension}`;

    const dataUrl = canvas.toDataURL(mimeType, 0.95);
    const downloadLink = document.createElement('a');
    downloadLink.href = dataUrl;
    downloadLink.download = cleanFilename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    return true;
  } catch (err) {
    console.error('Certificate PNG/JPG Download Failed:', err);

    // Fallback: SVG Download if rasterization fails
    try {
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const URLObj = window.URL || window.webkitURL || window;
      const svgUrl = URLObj.createObjectURL(svgBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = svgUrl;
      downloadLink.download = `${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}_Certificate.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URLObj.revokeObjectURL(svgUrl);
      return true;
    } catch (fallbackErr) {
      console.error('SVG fallback download also failed:', fallbackErr);
      return false;
    }
  }
}
