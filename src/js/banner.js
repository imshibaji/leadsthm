export default function Banner() {
    jQuery(document).ready(function($) {
        var slides = $(".banner");
        if (slides.length > 1) {
            let index = 0;
    
            function showSlide(i) {
                slides.eq(i-1).fadeOut(1000);
                slides.eq(i).fadeIn(1000);
                // slides.eq(i-1).fadeOut(1000, function() {
                //     slides.eq(i).fadeIn(1000);
                // });
            }
            slides.hide();
            showSlide(index);
    
            setInterval(function() {
                index = (index + 1) % slides.length;
                showSlide(index);
            }, 6000);
        }
    });
}