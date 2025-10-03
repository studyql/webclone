import JSZip from 'jszip';

export async function cloneWebsite(url, onProgress) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');
    const folderName = `${hostname.split('.')[0]}-clone`;

    onProgress('Fetching website content...');
    const response = await fetch(url, { mode: 'cors' });
    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const zip = new JSZip();
    const folder = zip.folder(folderName);
    let fileCount = 0;

    onProgress('Processing HTML...');
    const cssFiles = [];
    const jsFiles = [];
    const imageFiles = [];

    const styleLinks = doc.querySelectorAll('link[rel="stylesheet"]');
    onProgress(`Found ${styleLinks.length} CSS files...`);

    for (let i = 0; i < styleLinks.length; i++) {
      const link = styleLinks[i];
      const href = link.href;
      if (!href) continue;

      try {
        const fullUrl = href.startsWith('http') ? href : new URL(href, url).href;
        const cssResponse = await fetch(fullUrl, { mode: 'cors' });
        const cssContent = await cssResponse.text();
        const localFile = `css/style${i}.css`;
        cssFiles.push({ filename: localFile, content: cssContent });
        link.href = localFile;
      } catch (err) {
        console.error('Error fetching CSS:', href);
      }
    }

    const inlineStyles = doc.querySelectorAll('style');
    for (let i = 0; i < inlineStyles.length; i++) {
      const styleTag = inlineStyles[i];
      const localFile = `css/inline-style${i}.css`;
      cssFiles.push({ filename: localFile, content: styleTag.textContent });

      const linkEl = doc.createElement('link');
      linkEl.rel = 'stylesheet';
      linkEl.href = localFile;
      styleTag.replaceWith(linkEl);
    }

    const scripts = doc.querySelectorAll('script[src]');
    onProgress(`Found ${scripts.length} JavaScript files...`);

    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      const src = script.src;
      if (!src) continue;

      try {
        const fullUrl = src.startsWith('http') ? src : new URL(src, url).href;
        const jsResponse = await fetch(fullUrl, { mode: 'cors' });
        const jsContent = await jsResponse.text();
        const localFile = `js/script${i}.js`;
        jsFiles.push({ filename: localFile, content: jsContent });
        script.src = localFile;
      } catch (err) {
        console.error('Error fetching JS:', src);
      }
    }

    const images = doc.querySelectorAll('img');
    onProgress(`Found ${images.length} images...`);

    for (let i = 0; i < images.length && i < 20; i++) {
      const img = images[i];
      const srcAttr = img.getAttribute('src');
      if (!srcAttr) continue;

      try {
        const fullUrl = srcAttr.startsWith('http') ? srcAttr : new URL(srcAttr, url).href;
        const imgResponse = await fetch(fullUrl, { mode: 'cors' });
        const blob = await imgResponse.blob();

        const ext = fullUrl.split('.').pop().split('?')[0] || 'png';
        const localFile = `images/image${i}.${ext}`;
        imageFiles.push({ filename: localFile, content: blob });
        img.setAttribute('src', localFile);
        img.removeAttribute('srcset');
      } catch (err) {
        console.error('Error fetching image:', srcAttr);
      }
    }

    onProgress('Creating ZIP file...');

    folder.file('index.html', doc.documentElement.outerHTML);
    fileCount++;

    for (const cssFile of cssFiles) {
      folder.file(cssFile.filename, cssFile.content);
      fileCount++;
    }

    for (const jsFile of jsFiles) {
      folder.file(jsFile.filename, jsFile.content);
      fileCount++;
    }

    for (const imgFile of imageFiles) {
      folder.file(imgFile.filename, imgFile.content);
      fileCount++;
    }

    onProgress('Generating download...');
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    return {
      success: true,
      fileCount,
      zipData: {
        blob: zipBlob,
        filename: `${folderName}.zip`
      }
    };

  } catch (error) {
    console.error('Clone error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
