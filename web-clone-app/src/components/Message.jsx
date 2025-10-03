import { downloadZip } from '../utils/download';
import './Message.css';

function Message({ message }) {
  const { type, content, downloadData } = message;

  const handleDownload = () => {
    if (downloadData) {
      downloadZip(downloadData.blob, downloadData.filename);
    }
  };

  return (
    <div className={`message ${type}`}>
      <div className="message-content">
        {content}
      </div>
      {downloadData && (
        <button className="download-button" onClick={handleDownload}>
          Download ZIP ({downloadData.filename})
        </button>
      )}
    </div>
  );
}

export default Message;
