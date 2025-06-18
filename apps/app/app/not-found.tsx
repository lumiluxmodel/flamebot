// apps/app/app/not-found.tsx

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white font-mono overflow-hidden relative flex items-center justify-center">
      {/* Enhanced background with retro monitor effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(234,179,8,0.08),transparent_70%)]" />
        
        {/* Retro monitor horizontal lines */}
        <div className="absolute inset-0 opacity-[0.03] bg-[repeating-linear-gradient(0deg,transparent,transparent_1px,rgba(255,255,255,0.1)_1px,rgba(255,255,255,0.1)_2px)]" />
        
        {/* Top scan line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent animate-pulse" />
        
        {/* Moving scan line */}
        <div className="absolute left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-yellow-500/80 to-transparent animate-[scan_3s_linear_infinite] shadow-[0_0_10px_rgba(234,179,8,0.5)]" style={{ top: 0 }} />
        
        {/* Subtle vignette effect */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(0,0,0,0.3)_100%)]" />
        
        <style>
          {`
            @keyframes scan { 
              0% { top: 0; opacity: 1; } 
              50% { opacity: 0.8; } 
              100% { top: 100%; opacity: 0; } 
            }
            @keyframes glitch {
              0%, 100% { transform: translate(0); }
              20% { transform: translate(-1px, 1px); }
              40% { transform: translate(1px, -1px); }
              60% { transform: translate(-1px, -1px); }
              80% { transform: translate(1px, 1px); }
            }
          `}
        </style>
      </div>

      <div className="relative z-10 text-center space-y-8">
        {/* Main 404 with subtle glitch */}
        <div className="relative inline-block">
          <div className="text-[120px] md:text-[200px] font-bold text-yellow-500 tracking-wider animate-pulse select-none hover:animate-[glitch_0.3s_ease-in-out] transition-all duration-300">
            404
          </div>
          {/* Subtle text shadow for retro monitor effect */}
          <div className="absolute inset-0 text-[120px] md:text-[200px] font-bold text-yellow-500/20 tracking-wider blur-[1px] -z-10">
            404
          </div>
        </div>

        {/* Error messages */}
        <div className="space-y-4">
          <div className="text-2xl md:text-4xl uppercase tracking-widest text-red-500 animate-pulse select-none">
            ACCESS_DENIED
          </div>
          <div className="text-[11px] text-zinc-600 tracking-wider">
            アクセス拒否
          </div>
        </div>

        {/* Additional status info */}
        <div className="mt-12 space-y-2 text-[10px] text-zinc-500 tracking-wider">
          <div className="text-yellow-500">ERROR_CODE: 404_NOT_FOUND</div>
          <div>SYSTEM_STATUS: オンライン</div>
        </div>

        {/* Bottom flame symbol */}
        <div className="mt-16 text-6xl md:text-8xl font-bold text-zinc-900 opacity-30 hover:opacity-50 transition-opacity duration-500 select-none">
          炎
        </div>
      </div>
    </div>
  );
}
