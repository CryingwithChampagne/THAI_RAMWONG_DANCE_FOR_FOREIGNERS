import { useEffect, useRef, useState } from 'react';
import Button from '../components/Button.jsx';

const PoseCard = ({ pose, setSelectedPose, setCurrentPage, loadPoseDetails }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoadingPose, setIsLoadingPose] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (isHovered && videoRef.current) videoRef.current.play().catch(() => {});
    else if (!isHovered && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isHovered]);

  return (
    <div
      className={`bg-[#121826] border border-[#D4AF37]/20 hover:border-[#D4AF37] overflow-hidden transition-all duration-500 flex flex-col cursor-pointer group h-[60vh] max-h-[500px] ${isLoadingPose ? 'pointer-events-none opacity-75' : ''}`}
      onClick={async () => {
        if (isLoadingPose || !loadPoseDetails) return;
        setIsLoadingPose(true);
        const loadedPose = await loadPoseDetails(pose.id);
        if (loadedPose) {
          setSelectedPose(loadedPose);
          setCurrentPage('learning');
        }
        setIsLoadingPose(false);
      }}
      onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}
    >
      <div className="h-2/3 relative overflow-hidden flex items-center justify-center bg-black">
        <img src={pose.img} alt={pose.name} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 z-10 ${isHovered ? 'opacity-0' : 'opacity-80 grayscale group-hover:grayscale-0'}`} />
        {isHovered && pose.shortVideo && <video ref={videoRef} src={pose.shortVideo} muted loop playsInline className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-500 opacity-100`} />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121826] to-transparent z-20" />
      </div>
      <div className="p-6 flex-1 flex flex-col items-center text-center justify-center relative z-30 -mt-10">
        <h3 className="text-3xl font-serif mb-2 text-white group-hover:text-[#D4AF37] transition-colors drop-shadow-md">{pose.name}</h3>
        <p className="text-sm text-gray-400 leading-relaxed px-4">{isLoadingPose ? 'Loading lesson assets...' : pose.desc}</p>
      </div>
    </div>
  );
};

// ==========================================
// 4. Page: Pose Selection
// ==========================================
const PoseSelection = ({ setCurrentPage, setSelectedPose }) => {
  const [poses, setPoses] = useState([]);
  const [loadPoseDetailsFn, setLoadPoseDetailsFn] = useState(null);

  useEffect(() => {
    let isMounted = true;
    import('../config/poses.config.js').then(({ POSE_SUMMARIES, loadPoseDetails }) => {
      if (!isMounted) return;
      setPoses(POSE_SUMMARIES);
      setLoadPoseDetailsFn(() => loadPoseDetails);
    });
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#0B0F19] text-white flex flex-col">
      <div className="h-[8vh] min-h-[65px] flex justify-between items-center px-12 md:px-16 border-b border-white/5 bg-[#0B0F19] z-40 relative shadow-md">
        <div className="flex items-center gap-4">
          <div className="text-xl p-2.5 bg-yellow-900/40 text-[#D4AF37] rounded-lg border border-[#D4AF37]/30">🙏</div>
          <h2 className="text-xl font-serif text-[#D4AF37] uppercase tracking-widest font-bold">
            Select a Pose
          </h2>
        </div>
        <Button variant="outline" onClick={() => setCurrentPage('home')} className="text-xs px-6 py-2.5 rounded-xl">Exit</Button>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-7xl">
          {poses.map(pose => (
            <PoseCard
              key={pose.id}
              pose={pose}
              setSelectedPose={setSelectedPose}
              setCurrentPage={setCurrentPage}
              loadPoseDetails={loadPoseDetailsFn}
            />
          ))}
          {poses.length === 0 && (
            <div className="col-span-full text-center text-[#D4AF37] font-bold tracking-widest uppercase">
              Loading poses...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 5. Page Components - Learning Studio
// ==========================================

export default PoseSelection;
