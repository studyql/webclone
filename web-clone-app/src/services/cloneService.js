const API_URL = 'http://localhost:3001/api';

export async function cloneWebsite(url, onProgress) {
  try {
    onProgress('Starting to clone website...');
    onProgress('Fetching all pages and resources...');

    const response = await fetch(`${API_URL}/clone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to clone website');
    }

    onProgress('Processing complete! Preparing download...');

    const blob = await response.blob();
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');
    const filename = `${hostname.split('.')[0]}-clone.zip`;

    const zipSize = (blob.size / 1024).toFixed(2);
    onProgress(`Created ${zipSize}KB ZIP file with all resources`);

    return {
      success: true,
      fileCount: 0,
      zipData: {
        blob: blob,
        filename: filename
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
