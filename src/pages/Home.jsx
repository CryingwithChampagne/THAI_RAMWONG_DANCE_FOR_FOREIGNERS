import Button from '../components/Button.jsx';

const Home = ({ setCurrentPage }) => (
  <div className="w-full min-h-screen overflow-x-hidden flex flex-col items-center justify-center bg-[#05070C] text-white relative px-4 py-8 sm:px-6">
    <div className="absolute inset-0 z-1 bg-gradient-to-b from-[#05070C]/40 via-[#05070C]/80 to-[#05070C]" />
    
    {/* Delicate Royal Top Border Indicator */}
    <div className="absolute w-[1px] h-36 bg-gradient-to-b from-transparent to-[#D4AF37]/40 top-0"></div>
    
    {/* Premium Glass Container */}
    <div className="z-10 flex flex-col items-center text-center px-4 py-10 sm:px-8 sm:py-14 lg:py-16 border-y border-[#D4AF37]/20 bg-[#0A0E17]/40 backdrop-blur-xl w-full max-w-6xl rounded-2xl sm:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
      <h2 className="text-[#D4AF37] tracking-[0.32em] sm:tracking-[0.6em] text-[10px] sm:text-xs md:text-sm font-light mb-5 uppercase pl-[0.32em] sm:pl-[0.6em]">The Heritage of Grace</h2>
      
      {/* Luxury Golden Gradient Text */}
      <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-serif mb-6 tracking-wide text-transparent bg-clip-text bg-gradient-to-b from-[#FFF] via-[#D4AF37] to-[#AA7C11] drop-shadow-[0_10px_15px_rgba(0,0,0,0.9)] font-bold">
        RAM THAI
      </h1>
      
      <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent mb-8"></div>
      
      {/* ข้อความคำโปรยแถวเดียว และเว้นระยะห่าง mb-24 ให้สูงโปร่งจากตัวปุ่มตามบรีฟล่าสุด */}
      <p className="text-base sm:text-lg md:text-xl mb-12 sm:mb-20 lg:mb-24 font-light tracking-wide text-slate-200 max-w-2xl leading-relaxed">
        Experience the elegance of Thai tradition through state-of-the-art AI tracking.
      </p>
      
      {/* Premium Big Core Button (Enter) */}
      <Button onClick={() => setCurrentPage('select-pose')} className="w-full max-w-xs sm:w-auto text-base sm:text-lg px-12 sm:px-16 py-4 rounded-full shadow-[0_4px_25px_rgba(212,175,55,0.3)] hover:shadow-[0_4px_35px_rgba(212,175,55,0.5)] border border-[#FFDF00]/20">
        Enter
      </Button>
    </div>
  </div>
);

export default Home;
