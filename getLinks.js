import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

export const getAllLinks = async (url) => {
  const response = await fetch(url);
  const html = await response.text();
  const allLinks = [];
  const confirmLinks = [];
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const pageLinks = [...document.querySelectorAll('a')];

  if (pageLinks.length === 0) {
    confirmLinks.push(url);
    return confirmLinks;
  }

  for (const link of pageLinks) {
    let srcAttr = link.getAttribute('href');
    if (!srcAttr) continue;

    if (srcAttr.startsWith('http')) continue;

    srcAttr = srcAttr.replace(/^\//, '');

    allLinks.push(srcAttr);
  }

  const uniqueLinks = [...new Set(allLinks)];

  for (const link of uniqueLinks.slice(0, 5)) {
    const finalUrl = `${url}${link}`;

    try {
      const res = await fetch(finalUrl);
      if (res.ok) {
        confirmLinks.push(finalUrl);
      }
    } catch (err) {
      console.error(`Error fetching ${finalUrl}:`, err.message);
    }
  }

  if (confirmLinks.length === 0) {
    confirmLinks.push(url);
  }

  return confirmLinks;
};
