import coverDragonJpg from "@/assets/cover-dragon.jpg";
import coverForestJpg from "@/assets/cover-forest.jpg";
import coverSpaceJpg from "@/assets/cover-space.jpg";

export type CoverKey = "dragon" | "forest" | "space" | "castle" | "sea" | "jungle" | "stars" | "books" | "sport";

export function coverSrc(key: CoverKey) {
  if (key === "dragon") return coverDragonJpg;
  if (key === "forest") return coverForestJpg;
  if (key === "space") return coverSpaceJpg;
  return null;
}

const SVG_COVERS: Record<string, () => JSX.Element> = {
  castle: () => (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" className="size-full">
      <defs>
        <linearGradient id="cg1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a0533"/>
          <stop offset="100%" stopColor="#6b21a8"/>
        </linearGradient>
        <linearGradient id="cg2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c3aed"/>
          <stop offset="100%" stopColor="#4c1d95"/>
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#cg1)"/>
      {/* Stars */}
      {[[40,30],[80,60],[150,20],[200,50],[300,30],[350,70],[120,90],[280,80]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="1.5" fill="#fff" opacity="0.8"/>
      ))}
      {/* Moon */}
      <circle cx="320" cy="60" r="28" fill="#fde68a" opacity="0.9"/>
      <circle cx="335" cy="52" r="22" fill="#1a0533"/>
      {/* Castle body */}
      <rect x="120" y="200" width="160" height="180" fill="url(#cg2)"/>
      {/* Tower left */}
      <rect x="90" y="160" width="60" height="220" fill="#5b21b6"/>
      {/* Tower right */}
      <rect x="250" y="160" width="60" height="220" fill="#5b21b6"/>
      {/* Battlements left */}
      {[90,106,122,138].map((x,i)=><rect key={i} x={x} y="148" width="10" height="16" fill="#5b21b6"/>)}
      {/* Battlements right */}
      {[250,266,282,298].map((x,i)=><rect key={i} x={x} y="148" width="10" height="16" fill="#5b21b6"/>)}
      {/* Battlements center */}
      {[128,148,168,188,208,228,248].map((x,i)=><rect key={i} x={x} y="188" width="12" height="14" fill="#6d28d9"/>)}
      {/* Gate arch */}
      <rect x="175" y="300" width="50" height="80" fill="#1a0533"/>
      <ellipse cx="200" cy="300" rx="25" ry="20" fill="#1a0533"/>
      {/* Windows */}
      <ellipse cx="120" cy="230" rx="10" ry="14" fill="#fde68a" opacity="0.7"/>
      <ellipse cx="280" cy="230" rx="10" ry="14" fill="#fde68a" opacity="0.7"/>
      <ellipse cx="200" cy="240" rx="10" ry="14" fill="#fde68a" opacity="0.5"/>
      {/* Flag */}
      <line x1="200" y1="188" x2="200" y2="155" stroke="#fde68a" strokeWidth="2"/>
      <polygon points="200,155 220,163 200,171" fill="#f59e0b"/>
      {/* Ground */}
      <ellipse cx="200" cy="390" rx="160" ry="20" fill="#4c1d95" opacity="0.5"/>
    </svg>
  ),

  sea: () => (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" className="size-full">
      <defs>
        <linearGradient id="sg1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0c4a6e"/>
          <stop offset="60%" stopColor="#0369a1"/>
          <stop offset="100%" stopColor="#0284c7"/>
        </linearGradient>
        <linearGradient id="sg2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8"/>
          <stop offset="100%" stopColor="#0369a1"/>
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#sg1)"/>
      {/* Sun */}
      <circle cx="320" cy="70" r="40" fill="#fbbf24" opacity="0.9"/>
      <circle cx="320" cy="70" r="30" fill="#fde68a"/>
      {/* Sun rays */}
      {[0,45,90,135,180,225,270,315].map((deg,i)=>(
        <line key={i} x1="320" y1="70"
          x2={320+Math.cos(deg*Math.PI/180)*55}
          y2={70+Math.sin(deg*Math.PI/180)*55}
          stroke="#fbbf24" strokeWidth="2" opacity="0.6"/>
      ))}
      {/* Clouds */}
      <ellipse cx="80" cy="80" rx="45" ry="22" fill="white" opacity="0.8"/>
      <ellipse cx="110" cy="68" rx="30" ry="20" fill="white" opacity="0.8"/>
      <ellipse cx="160" cy="100" rx="35" ry="18" fill="white" opacity="0.7"/>
      {/* Boat hull */}
      <ellipse cx="200" cy="260" rx="90" ry="28" fill="#92400e"/>
      <rect x="115" y="232" width="170" height="28" fill="#b45309"/>
      {/* Sail */}
      <line x1="200" y1="100" x2="200" y2="235" stroke="#78350f" strokeWidth="4"/>
      <polygon points="200,110 200,220 115,185" fill="white" opacity="0.95"/>
      <polygon points="200,110 200,220 285,185" fill="#fde68a" opacity="0.9"/>
      {/* Waves */}
      <path d="M0 290 Q50 275 100 290 Q150 305 200 290 Q250 275 300 290 Q350 305 400 290 L400 400 L0 400Z" fill="#0ea5e9" opacity="0.7"/>
      <path d="M0 310 Q50 295 100 310 Q150 325 200 310 Q250 295 300 310 Q350 325 400 310 L400 400 L0 400Z" fill="#38bdf8" opacity="0.6"/>
      <path d="M0 340 Q50 325 100 340 Q150 355 200 340 Q250 325 300 340 Q350 355 400 340 L400 400 L0 400Z" fill="#7dd3fc" opacity="0.5"/>
      {/* Fish */}
      <ellipse cx="80" cy="360" rx="18" ry="10" fill="#f472b6" opacity="0.8"/>
      <polygon points="98,360 112,350 112,370" fill="#f472b6" opacity="0.8"/>
      <circle cx="74" cy="357" r="2" fill="white"/>
    </svg>
  ),

  jungle: () => (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" className="size-full">
      <defs>
        <linearGradient id="jg1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#064e3b"/>
          <stop offset="100%" stopColor="#065f46"/>
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#jg1)"/>
      {/* Background trees */}
      <ellipse cx="80" cy="150" rx="55" ry="70" fill="#047857" opacity="0.6"/>
      <ellipse cx="320" cy="130" rx="60" ry="80" fill="#047857" opacity="0.6"/>
      <ellipse cx="200" cy="100" rx="70" ry="90" fill="#065f46" opacity="0.7"/>
      {/* Trunks back */}
      <rect x="72" y="200" width="16" height="200" fill="#92400e" opacity="0.6"/>
      <rect x="312" y="180" width="16" height="220" fill="#92400e" opacity="0.6"/>
      <rect x="192" y="160" width="16" height="240" fill="#78350f" opacity="0.7"/>
      {/* Mid trees */}
      <ellipse cx="50" cy="220" rx="50" ry="65" fill="#059669"/>
      <ellipse cx="350" cy="200" rx="55" ry="70" fill="#059669"/>
      {/* Trunk mid */}
      <rect x="42" y="265" width="16" height="135" fill="#92400e"/>
      <rect x="342" y="245" width="16" height="155" fill="#92400e"/>
      {/* Monkey */}
      <circle cx="200" cy="180" r="22" fill="#d97706"/>
      <ellipse cx="200" cy="195" rx="16" ry="12" fill="#fbbf24"/>
      <circle cx="190" cy="174" r="7" fill="#d97706"/>
      <circle cx="210" cy="174" r="7" fill="#d97706"/>
      <ellipse cx="190" cy="176" rx="4" ry="3" fill="#fde68a"/>
      <ellipse cx="210" cy="176" rx="4" ry="3" fill="#fde68a"/>
      <circle cx="188" cy="175" r="2" fill="#1a1a1a"/>
      <circle cx="208" cy="175" r="2" fill="#1a1a1a"/>
      <ellipse cx="200" cy="182" rx="6" ry="4" fill="#fbbf24"/>
      {/* Tail */}
      <path d="M216,192 Q240,210 230,230 Q220,250 240,260" stroke="#d97706" strokeWidth="4" fill="none" strokeLinecap="round"/>
      {/* Ground foliage */}
      <ellipse cx="200" cy="390" rx="200" ry="40" fill="#047857" opacity="0.8"/>
      <ellipse cx="100" cy="380" rx="80" ry="30" fill="#059669"/>
      <ellipse cx="300" cy="375" rx="90" ry="35" fill="#059669"/>
      {/* Flowers */}
      {[[60,350],[150,360],[260,355],[340,345]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="6" fill={["#f472b6","#fbbf24","#f472b6","#a78bfa"][i]}/>
      ))}
      {/* Vines */}
      <path d="M30,0 Q20,100 40,200 Q60,300 30,400" stroke="#16a34a" strokeWidth="3" fill="none" opacity="0.7"/>
      <path d="M370,0 Q380,100 360,200 Q340,300 370,400" stroke="#16a34a" strokeWidth="3" fill="none" opacity="0.7"/>
    </svg>
  ),

  stars: () => (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" className="size-full">
      <defs>
        <linearGradient id="stg1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#020617"/>
          <stop offset="100%" stopColor="#0f172a"/>
        </linearGradient>
        <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fde68a" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#fde68a" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect width="400" height="400" fill="url(#stg1)"/>
      {/* Milky way */}
      <ellipse cx="200" cy="200" rx="60" ry="200" fill="#a5b4fc" opacity="0.05" transform="rotate(30 200 200)"/>
      {/* Stars many */}
      {[
        [30,40],[70,20],[110,50],[160,15],[200,35],[250,25],[300,45],[360,30],
        [20,100],[90,80],[140,110],[190,70],[240,95],[310,75],[380,100],
        [50,150],[130,160],[220,140],[290,155],[370,145],
        [40,200],[100,210],[180,195],[260,205],[350,200],
        [60,250],[150,260],[230,245],[320,255],
        [80,300],[170,310],[280,300],[360,310],
        [30,350],[120,360],[210,345],[300,355],[370,365],
      ].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r={Math.random()<0.2?2:1} fill="white" opacity={0.4+Math.random()*0.6}/>
      ))}
      {/* Big moon glow */}
      <circle cx="200" cy="140" r="70" fill="url(#moonGlow)"/>
      {/* Moon */}
      <circle cx="200" cy="140" r="50" fill="#fef3c7"/>
      <circle cx="225" cy="125" r="38" fill="#020617"/>
      {/* Craters */}
      <circle cx="185" cy="155" r="6" fill="#fde68a" opacity="0.4"/>
      <circle cx="175" cy="130" r="4" fill="#fde68a" opacity="0.3"/>
      {/* Shooting star */}
      <line x1="300" y1="60" x2="360" y2="20" stroke="white" strokeWidth="2" opacity="0.8"/>
      <circle cx="300" cy="60" r="3" fill="white"/>
      {/* Constellation lines */}
      <polyline points="50,150 90,80 140,110 90,80 20,100" stroke="#a5b4fc" strokeWidth="0.8" fill="none" opacity="0.4"/>
      {/* Hills silhouette */}
      <path d="M0 320 Q80 260 160 300 Q240 340 320 270 Q360 240 400 280 L400 400 L0 400Z" fill="#0f172a"/>
      <path d="M0 360 Q100 330 200 350 Q300 370 400 340 L400 400 L0 400Z" fill="#1e293b"/>
      {/* Sleeping child silhouette hint */}
      <ellipse cx="200" cy="385" rx="40" ry="12" fill="#334155"/>
    </svg>
  ),

  books: () => (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" className="size-full">
      <defs>
        <linearGradient id="bg1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e3a5f"/>
          <stop offset="100%" stopColor="#0f2340"/>
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#bg1)"/>
      {/* Desk surface */}
      <rect x="0" y="300" width="400" height="100" fill="#92400e" opacity="0.7"/>
      <rect x="0" y="295" width="400" height="10" fill="#b45309"/>
      {/* Stack of books */}
      {/* Book 1 - bottom red */}
      <rect x="80" y="230" width="160" height="30" rx="3" fill="#dc2626"/>
      <rect x="80" y="230" width="12" height="30" rx="2" fill="#b91c1c"/>
      <line x1="100" y1="235" x2="100" y2="255" stroke="#fca5a5" strokeWidth="1" opacity="0.5"/>
      {/* Book 2 - blue */}
      <rect x="88" y="200" width="150" height="30" rx="3" fill="#1d4ed8"/>
      <rect x="88" y="200" width="12" height="30" rx="2" fill="#1e40af"/>
      {/* Book 3 - green */}
      <rect x="92" y="172" width="145" height="30" rx="3" fill="#15803d"/>
      <rect x="92" y="172" width="12" height="30" rx="2" fill="#166534"/>
      {/* Open book on desk */}
      <path d="M110 295 Q200 280 290 295 L290 260 Q200 245 110 260Z" fill="#fef9c3"/>
      <line x1="200" y1="247" x2="200" y2="295" stroke="#d97706" strokeWidth="1.5"/>
      {/* Text lines on open book */}
      {[268,276,284].map((y,i)=>(
        <line key={i} x1={120+i*2} y1={y} x2={190} y2={y} stroke="#92400e" strokeWidth="1" opacity="0.4"/>
      ))}
      {[268,276,284].map((y,i)=>(
        <line key={i} x1={210} y1={y} x2={278-i*2} y2={y} stroke="#92400e" strokeWidth="1" opacity="0.4"/>
      ))}
      {/* Magnifying glass */}
      <circle cx="310" cy="200" r="35" fill="none" stroke="#fbbf24" strokeWidth="4"/>
      <circle cx="310" cy="200" r="30" fill="#bfdbfe" opacity="0.3"/>
      <line x1="335" y1="225" x2="355" y2="248" stroke="#fbbf24" strokeWidth="6" strokeLinecap="round"/>
      {/* Stars/sparkles around */}
      {[[50,80],[350,60],[60,180],[360,160],[180,50],[340,280]].map(([x,y],i)=>(
        <text key={i} x={x} y={y} fontSize="16" textAnchor="middle" fill="#fbbf24" opacity="0.7">✦</text>
      ))}
      {/* Lamp */}
      <rect x="320" y="220" width="8" height="80" fill="#78716c"/>
      <ellipse cx="324" cy="220" rx="25" ry="12" fill="#fbbf24" opacity="0.9"/>
      <ellipse cx="324" cy="220" rx="25" ry="12" fill="none" stroke="#d97706" strokeWidth="2"/>
      {/* Lamp glow */}
      <ellipse cx="324" cy="240" rx="40" ry="25" fill="#fbbf24" opacity="0.1"/>
      {/* Pencil */}
      <rect x="140" y="290" width="6" height="50" rx="2" fill="#fbbf24" transform="rotate(-20 143 315)"/>
      <polygon points="140,335 146,335 143,348" fill="#fca5a5" transform="rotate(-20 143 335)"/>
    </svg>
  ),

  sport: () => (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" className="size-full">
      <defs>
        <linearGradient id="spg1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0c4a6e"/>
          <stop offset="55%" stopColor="#0369a1"/>
          <stop offset="100%" stopColor="#16a34a"/>
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#spg1)"/>
      <circle cx="320" cy="70" r="35" fill="#fde68a" opacity="0.9"/>
      <ellipse cx="80" cy="70" rx="40" ry="20" fill="white" opacity="0.7"/>
      <ellipse cx="105" cy="60" rx="28" ry="18" fill="white" opacity="0.7"/>
      <rect x="0" y="230" width="400" height="170" fill="#16a34a"/>
      <rect x="30" y="250" width="340" height="135" fill="none" stroke="white" strokeWidth="3" opacity="0.6"/>
      <circle cx="200" cy="317" r="38" fill="none" stroke="white" strokeWidth="3" opacity="0.6"/>
      <line x1="200" y1="250" x2="200" y2="385" stroke="white" strokeWidth="3" opacity="0.6"/>
      <rect x="20" y="290" width="20" height="55" fill="none" stroke="white" strokeWidth="3" opacity="0.6"/>
      <rect x="360" y="290" width="20" height="55" fill="none" stroke="white" strokeWidth="3" opacity="0.6"/>
      <circle cx="200" cy="240" r="32" fill="white"/>
      <circle cx="200" cy="240" r="32" fill="none" stroke="#1e293b" strokeWidth="2"/>
      <polygon points="200,218 211,226 207,239 193,239 189,226" fill="#1e293b"/>
      <polygon points="178,232 189,226 193,239 184,250 172,245" fill="#1e293b" opacity="0.9"/>
      <polygon points="222,232 211,226 207,239 216,250 228,245" fill="#1e293b" opacity="0.9"/>
      <g transform="translate(80,290)">
        <rect x="-4" y="38" width="8" height="14" fill="#fbbf24"/>
        <rect x="-16" y="48" width="32" height="8" rx="2" fill="#f59e0b"/>
        <path d="M-14,0 L14,0 L11,30 Q0,38 -11,30 Z" fill="#fbbf24"/>
        <circle cx="0" cy="12" r="5" fill="#fde68a"/>
      </g>
      {[[60,180],[330,180],[150,100],[260,110]].map(([x,y],i)=>(
        <text key={i} x={x} y={y} fontSize="18" textAnchor="middle" fill="#fde68a" opacity="0.85">✦</text>
      ))}
    </svg>
  ),
};

export function StoryCover({
  coverKey,
  className = "",
  priority = false,
  alt = "",
}: {
  coverKey: CoverKey;
  className?: string;
  priority?: boolean;
  alt?: string;
}) {
  const SvgComponent = SVG_COVERS[coverKey];
  if (SvgComponent) {
    return (
      <div className={`overflow-hidden ${className}`} aria-label={alt}>
        <SvgComponent />
      </div>
    );
  }
  // fallback to jpg for dragon, forest, space
  const src = coverKey === "dragon" ? coverDragonJpg : coverKey === "forest" ? coverForestJpg : coverSpaceJpg;
  return (
    <img
      src={src}
      alt={alt}
      width={1024}
      height={1024}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={`object-cover ${className}`}
    />
  );
}