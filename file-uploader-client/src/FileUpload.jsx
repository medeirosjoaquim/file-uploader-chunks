import React, { useState } from 'react';
import './App.css';

const FileUpload = () => {
  const [progress, setProgress] = useState(0);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    const worker = new Worker('./uploadWorker.js');

    worker.addEventListener('message', (event) => {
      console.log(event)
      if (event.data.progress) {
        setProgress(event.data.progress);
      }

      if (event.data.complete) {
        console.log('Upload complete');
      }
    });

    worker.postMessage({ file });
  };

  return (
    <div className="file-upload-container">
      <input
        type="file"
        id="file-input"
        className="file-input"
        onChange={handleFileChange}
      />
      <label htmlFor="file-input" className="custom-file-input">
        Choose file
      </label>
      <div className="progress-container">
        <div className="progress-bar">
          <div className="progress" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="progress-text">Upload progress: {progress.toFixed(2)}%</div>
      </div>
    </div>
  );
};

export default FileUpload;
