// apps/app/app/not-found.tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white font-mono overflow-hidden relative">
      {/* Background effects matching main page */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(234,179,8,0.03),transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.015] bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.05)_2px,rgba(255,255,255,0.05)_4px)]" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent animate-pulse" />
      </div>

      <div className="flex items-center justify-center min-h-screen relative z-10">
        <div className="text-center space-y-8 p-8">
          {/* Main 404 display */}
          <div className="space-y-4">
            <div className="text-[120px] md:text-[200px] font-bold text-yellow-500 tracking-wider animate-pulse">
              404
            </div>
            <div className="text-[10px] text-zinc-600 mb-2">ERROR_CODE</div>
            <div className="text-2xl md:text-4xl uppercase tracking-widest text-white">
              Page Not Found
            </div>
            <div className="text-[10px] text-zinc-600 mt-2">PAGE_NOT_FOUND</div>
          </div>

          {/* Status indicators */}
          <div className="space-y-4 max-w-md mx-auto">
            <div className="bg-zinc-950/40 border border-zinc-800/50 p-4 backdrop-blur-sm">
              <div className="text-[10px] text-zinc-500 mb-2">STATUS</div>
              <div className="text-yellow-500 text-sm font-mono">404_NOT_FOUND</div>
            </div>
            
            <div className="bg-zinc-950/40 border border-zinc-800/50 p-4 backdrop-blur-sm">
              <div className="text-[10px] text-zinc-500 mb-2">MESSAGE</div>
              <div className="text-zinc-400 text-sm">The requested resource does not exist in the system.</div>
            </div>

          </div>

          {/* Navigation */}
          <div className="pt-8">
            <Link 
              href="/"
              className="inline-block px-8 py-3 border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 transition-all duration-300 hover:border-yellow-500/50"
            >
              <div className="text-[10px] text-zinc-600 mb-1">RETURN_TO</div>
              <div className="text-sm uppercase tracking-wider">MAIN_DASHBOARD</div>
            </Link>
          </div>
        </div>
      </div>

      {/* Corner accent matching main page */}
      <div className="absolute bottom-0 right-0 w-16 md:w-24 h-16 md:h-24 opacity-50" 
           style={{
             clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
             background: 'repeating-linear-gradient(45deg, #eab308, #eab308 2px, #18181b 2px, #18181b 4px)'
           }}>
      </div>
    </div>
  );
}
