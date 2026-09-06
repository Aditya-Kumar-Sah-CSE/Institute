import html2canvas from 'html2canvas-pro';

export function downloadLatexFile(content: string, filename: string = 'document.tex'): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.tex') ? filename : `${filename}.tex`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportElementAsPng(elementId: string, filename: string = 'latex-render.png'): Promise<boolean> {
  const target = document.getElementById(elementId);
  if (!target) return false;

  try {
    const canvas = await html2canvas(target, {
      backgroundColor: '#0d1117',
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (err) {
    console.error('PNG export failed:', err);
    return false;
  }
}
