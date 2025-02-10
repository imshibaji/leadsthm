import Animete from './js/animate';
import Banner from './js/banner';
import Nav from './js/nav';
import Navbar from './js/navbar';
import Alpine from 'alpinejs';
import Time from './js/time';
import animateCSS from './js/animate-css';
import { animate, hover, inView, press, scroll } from 'motion';


window.Alpine = Alpine;
Alpine.start();
window.moment = Time();
window.animateCSS = animateCSS;
window.animate = animate;
window.inView = inView;
window.scroll = scroll;
window.hover = hover;
window.press = press;

Animete();
Nav();
Navbar();
Banner();