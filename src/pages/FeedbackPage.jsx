import Button from '../components/Button.jsx';

const FeedbackPage = ({ setCurrentPage, finalAverageScore, selectedPose }) => (
  <div className="w-screen h-screen overflow-hidden bg-[#0B0F19] flex items-center justify-center text-white relative font-sans">
    <div className="z-10 bg-[#121826] p-12 rounded-2xl shadow-2xl w-full max-w-2xl border border-[#D4AF37]/30 flex flex-col items-center">
      <h2 className="text-4xl font-serif mb-2 text-[#D4AF37] font-bold">🎉 Excellent Work!</h2>
      <p className="text-gray-400 text-sm tracking-widest uppercase mb-2 text-center font-medium">Lesson Complete</p>
      <p className="text-gray-300 text-xl font-serif mb-8 text-center border-b border-white/5 pb-2 w-full">{selectedPose?.name}</p>
      
      <div className="w-48 h-48 rounded-full border-4 border-[#D4AF37] flex flex-col items-center justify-center bg-black/40 shadow-[0_0_40px_rgba(212,175,55,0.2)] mb-10 relative">
         <div className="absolute inset-1.5 rounded-full border border-[#D4AF37]/20"></div>
         <p className="text-xs text-gray-400 uppercase mb-1 font-medium">Best Score</p>
         <span className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-[#D4AF37] to-[#FFDF00]">{finalAverageScore}%</span>
         <p className="text-[10px] text-yellow-500 mt-2 uppercase font-bold tracking-wider">👑 Peak Rating</p>
      </div>

      <div className="flex w-full gap-4">
        <Button onClick={() => setCurrentPage('learning')} variant="outline" className="flex-1 py-4 rounded-xl">🔄 Try Again</Button>
        <Button onClick={() => setCurrentPage('select-pose')} variant="primary" className="flex-1 py-4 rounded-xl">⏭️ Next Pose</Button>
      </div>
    </div>
  </div>
);

export default FeedbackPage;
