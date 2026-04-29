import React, { useEffect } from 'react';

const AdBanner = ({ dataAdSlot, format = 'auto', responsive = 'true', style = { display: 'block' } }) => {
  useEffect(() => {
    try {
      if (window.adsbygoogle) {
        window.adsbygoogle.push({});
      }
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, []);

  return (
    <div className="ad-container" style={{ margin: '16px 0', textAlign: 'center', width: '100%', overflow: 'hidden' }}>
      <ins
        className="adsbygoogle"
        style={style}
        data-ad-client="ca-pub-7208255509057337"
        data-ad-slot={dataAdSlot || '1234567890'} // Provide a fallback test slot or real slot
        data-ad-format={format}
        data-full-width-responsive={responsive}
      />
    </div>
  );
};

export default AdBanner;
