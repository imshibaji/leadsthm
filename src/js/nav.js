export default function Nav() {
    const navMenu = document.querySelector('.nav-menu');
    const navUl = document.querySelector('.nav-ul');
    if(!navMenu || !navUl) return;
    window.addEventListener('load', () => {
        if (window.innerWidth < 768) {
            navUl.style.display = 'none';
            return
        }
    })
    window.addEventListener('resize', () => {
        if (window.innerWidth < 768) {
            navUl.style.display = 'none';
            return
        } else {
            navUl.removeAttribute('style');
            return
        }
    });
    navMenu.addEventListener('click', () => {
        if (navUl.style.display === 'block') {
            navUl.style.display = 'none';
            return
        } else {
            navUl.style.display = 'block';
            return
        }
    });
}