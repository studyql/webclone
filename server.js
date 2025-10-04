import express from 'express';
import cors from 'cors';
import archiver from 'archiver';
import { scrapeWebsite } from './scraper.js';
import { getAllLinks } from './getLinks.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/api/clone', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');
    const folderName = `${hostname.split('.')[0]}-clone`;

    const allLinks = await getAllLinks(url);

    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    res.attachment(`${folderName}.zip`);
    archive.pipe(res);

    let totalFiles = 0;

    if (allLinks.length >= 1) {
      for (const link of allLinks) {
        const slug = link.replace(/.*\/([^\/]+)\/?$/, '$1') || 'index';

        const { html, cssFiles, jsFiles, imageFiles = [] } = await scrapeWebsite(link, slug, folderName);

        const fileName = slug.startsWith('www') ? 'index' : slug;
        archive.append(html, { name: `${folderName}/${fileName}.html` });
        totalFiles++;

        for (const cssFile of cssFiles) {
          archive.append(cssFile.content, { name: `${folderName}/${cssFile.filename}` });
          totalFiles++;
        }

        for (const jsFile of jsFiles) {
          archive.append(jsFile.content, { name: `${folderName}/${jsFile.filename}` });
          totalFiles++;
        }

        for (const imgFile of imageFiles) {
          archive.append(imgFile.content, { name: `${folderName}/${imgFile.filename}` });
          totalFiles++;
        }
      }
    }

    archive.finalize();

  } catch (error) {
    console.error('Clone error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
