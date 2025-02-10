export default function Navbar(){
    jQuery(document).ready(function($) {
        $(".mega-dropdown > a").click(function(e) {
            e.preventDefault();
            $(this).next(".mega-submenu").slideToggle();
        });
    });    
}