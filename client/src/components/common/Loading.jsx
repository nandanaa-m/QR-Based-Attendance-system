import './Loading.css';

const Loading = ({ message = 'Loading...', size = 'md' }) => {
  return (
    <div className={`loading-container ${size}`}>
      <div className="loading-spinner">
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
};

export default Loading;

