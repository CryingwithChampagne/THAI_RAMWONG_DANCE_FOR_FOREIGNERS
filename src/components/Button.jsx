const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const baseStyle = "inline-flex items-center justify-center text-center rounded-lg font-bold tracking-wider uppercase transition-all duration-300";
  const variants = {
    primary: "bg-gradient-to-r from-[#B8860B] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#FFD700] text-black shadow-[0_0_20px_rgba(212,175,55,0.5)] px-8 py-3.5 text-base md:text-lg",
    outline: "border-2 border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black px-8 py-3.5 text-base md:text-lg bg-black/20",
    disabled: "bg-gray-700 text-gray-400 cursor-not-allowed px-8 py-3.5 text-base md:text-lg"
  };
  return (
    <button disabled={disabled} onClick={onClick} className={`${baseStyle} ${disabled ? variants.disabled : variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

// ==========================================
// 3. Page Components - Home
// ==========================================

export default Button;
