// Halke SVG icons (emoji ki jagah) - currentColor use karte hain
const I = (d, fill) => function Icon(p) {
  return <svg className="i" viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>{d}</svg>;
};
export const Win = I(<path d="M3 5.500l8-1.100v7.100H3zM12 4.300L21 3v8.500h-9zM3 12.500h8v7.100L3 18.500zM12 12.500h9V21l-9-1.300z" />, true);
export const Apple = I(<path d="M16.400 12.600c0-2.300 1.900-3.400 2-3.500-1.100-1.600-2.800-1.800-3.400-1.800-1.400-.1-2.800.9-3.500.9-.7 0-1.800-.8-3-.8-1.500 0-3 .9-3.800 2.300-1.600 2.800-.4 7 1.200 9.300.8 1.100 1.700 2.400 2.900 2.300 1.200 0 1.600-.7 3-.7s1.800.7 3 .7 2-1.100 2.800-2.200c.9-1.300 1.200-2.500 1.300-2.600-.1 0-2.500-1-2.500-3.900zM14.200 5.800c.6-.8 1.100-1.800.9-2.800-.9 0-2 .6-2.600 1.400-.6.700-1.100 1.700-.9 2.700 1 .1 2-.5 2.600-1.300z" />, true);
export const Game = I(<><path d="M6 8h12a4 4 0 014 4v3a2.500 2.500 0 01-4.300 1.700L15.500 14h-7l-2.200 2.700A2.500 2.500 0 012 15v-3a4 4 0 014-4z" /><path d="M8 10.500v3M6.500 12h3" /></>);
export const Search = I(<><circle cx="11" cy="11" r="6.500" /><path d="M16 16l4.500 4.500" /></>);
export const Heart = I(<path d="M12 20s-7-4.400-7-10a4 4 0 017-2.500A4 4 0 0119 10c0 5.600-7 10-7 10z" />);
export const Clock = I(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>);
export const Down = I(<path d="M12 4v11M7 11l5 5 5-5M5 20h14" />);
export const Chev = I(<path d="M9 6l6 6-6 6" />);
export const Grid = I(<><rect x="3.500" y="3.500" width="7" height="7" rx="1.500" /><rect x="13.500" y="3.500" width="7" height="7" rx="1.500" /><rect x="3.500" y="13.500" width="7" height="7" rx="1.500" /><rect x="13.500" y="13.500" width="7" height="7" rx="1.500" /></>);
export const Folder = I(<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />);
export const Android = I(<path d="M6 10h12v8a1.500 1.500 0 01-1.500 1.500h-9A1.500 1.500 0 016 18zM8 6.500a4 4 0 018 0zM9 4L7.500 2M15 4l1.500-2M3.500 11v5M20.500 11v5" />);
export const Book = I(<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h11" />);
export const Video = I(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M10 9.500v5l4.500-2.500z" /></>);
export const Cloud = I(<><path d="M7 18a4 4 0 01-.5-7.970A5.500 5.500 0 0117 9.500 4.200 4.200 0 0117 18" /><path d="M12 11v7M9 15l3 3 3-3" /></>);
export const Star = I(<path d="M12 2.500l2.900 6 6.600.9-4.800 4.600 1.200 6.500L12 17.400 6.100 20.500l1.200-6.500L2.500 9.400l6.600-.9z" />, true);
export const Crown = I(<path d="M3 7l4.500 4L12 4l4.500 7L21 7l-2 11H5z" />, true);
export const Tick = I(<path d="M5 12.500l4.500 4.500L19 7.500" />);
export const GridFill = I(<><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="8" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /><rect x="13" y="13" width="8" height="8" rx="2" /></>, true);
export const Close = I(<path d="M5 5l14 14M19 5L5 19" />);