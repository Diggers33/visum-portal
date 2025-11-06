import React, { useState, useImgAttributes } from 'react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  fallbackSrc: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  fallbackSrc,
  className = '',
  onLoad,
  onError,
}) => {
  const [imageSrc, setImageSrc] = useState<string>(src);
  const [hasError, setHasError] = useState<boolean>(false);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImageSrc(fallbackSrc);
      if (onError) {
        onError();
      }
    }
  };

  const handleLoad = () => {
    if (onLoad) {
      onLoad();
    }
  };

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      onError={handleError}
      onLoad={handleLoad}
    />
  );
};

export default ImageWithFallback;
