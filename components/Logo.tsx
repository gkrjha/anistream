import Link from 'next/link';

interface Props {
  size?: number;   // icon size in px, default 36
  textSize?: string; // tailwind text size class, default 'text-xl'
  subtitle?: string; // optional subtitle below name
  href?: string;
}

export default function Logo({ size = 36, textSize = 'text-xl', subtitle, href = '/' }: Props) {
  return (
    <Link href={href} className="flex items-center gap-2.5 shrink-0 group">
      <div
        className="shrink-0 group-hover:rotate-[30deg] transition-transform duration-500 drop-shadow-[0_0_8px_rgba(229,9,20,0.6)]"
        style={{ width: size, height: size }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={size} height={size}>
          <circle cx="256" cy="256" r="256" fill="#0a0a0a"/>
          <circle cx="256" cy="256" r="220" fill="#e50914"/>
          <circle cx="256" cy="256" r="175" fill="#0a0a0a"/>
          <path d="M256,81 C290,81 330,120 330,175 C330,205 315,228 295,240 C275,252 256,252 256,252 C256,252 237,252 217,240 C197,228 182,205 182,175 C182,120 222,81 256,81Z" fill="#e50914"/>
          <path d="M256,81 C290,81 330,120 330,175 C330,205 315,228 295,240 C275,252 256,252 256,252 C256,252 237,252 217,240 C197,228 182,205 182,175 C182,120 222,81 256,81Z" fill="#e50914" transform="rotate(120,256,256)"/>
          <path d="M256,81 C290,81 330,120 330,175 C330,205 315,228 295,240 C275,252 256,252 256,252 C256,252 237,252 217,240 C197,228 182,205 182,175 C182,120 222,81 256,81Z" fill="#e50914" transform="rotate(240,256,256)"/>
          <circle cx="256" cy="256" r="90" fill="#0a0a0a"/>
          <circle cx="256" cy="256" r="45" fill="#e50914"/>
          <circle cx="256" cy="256" r="18" fill="#0a0a0a"/>
        </svg>
      </div>
      <div>
        <span className={`text-white font-black ${textSize} tracking-tight`}>
          Ani<span className="text-red-500">Stream</span>
        </span>
        {subtitle && <p className="text-gray-600 text-xs mt-0.5">{subtitle}</p>}
      </div>
    </Link>
  );
}
