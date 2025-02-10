<footer class="footer">
    <div class="wrapper">
        <div class="footer-content">
            <div class="footer-menu">
                <h4>Quick Links</h4>
                <ul>
                    <li><a href="#"><img src="<?php echo get_template_directory_uri(); ?>/assets/imgs/icons/home1.svg" alt="facebook"> Home</a></li>
                    <li><a href="#"><img src="<?php echo get_template_directory_uri(); ?>/assets/imgs/icons/home1.svg" alt="facebook"> About</a></li>
                    <li><a href="#"><img src="<?php echo get_template_directory_uri(); ?>/assets/imgs/icons/home1.svg" alt="facebook"> Articles</a></li>
                    <li><a href="#"><img src="<?php echo get_template_directory_uri(); ?>/assets/imgs/icons/home1.svg" alt="facebook"> Services</a></li>
                    <li><a href="#"><img src="<?php echo get_template_directory_uri(); ?>/assets/imgs/icons/home1.svg" alt="facebook"> Contact</a></li>
                </ul>
            </div>
            <hr class="footer-line">
            <div class="footer-menu">
                <h4>Quick Links</h4>
                <ul>
                    <li><a href="#"><img src="<?php echo get_template_directory_uri(); ?>/assets/imgs/icons/home.svg" alt="facebook"> Home</a></li>
                    <li><a href="#"><img src="<?php echo get_template_directory_uri(); ?>/assets/imgs/icons/home.svg" alt="facebook"> About</a></li>
                    <li><a href="#"><img src="<?php echo get_template_directory_uri(); ?>/assets/imgs/icons/home.svg" alt="facebook"> Articles</a></li>
                    <li><a href="#"><img src="<?php echo get_template_directory_uri(); ?>/assets/imgs/icons/home.svg" alt="facebook"> Services</a></li>
                    <li><a href="#"><img src="<?php echo get_template_directory_uri(); ?>/assets/imgs/icons/home.svg" alt="facebook"> Contact</a></li>
                </ul>
            </div>
            <hr class="footer-line">
            <div class="footer-social">
                <h4>Follow Us</h4>
                <ul>
                    <li><a href="#"><img src="<?php echo get_template_directory_uri(); ?>/assets/imgs/icons/facebook.svg" alt="facebook"> Facebook</a></li>
                    <li><a href="#"><img src="<?php echo get_template_directory_uri(); ?>/assets/imgs/icons/instagram.svg" alt="instagram"> Instagram</a></li>
                    <li><a href="#"><img src="<?php echo get_template_directory_uri(); ?>/assets/imgs/icons/linkedin.svg" alt="linkedin"> LinkedIn</a></li>
                    <li><a href="#"><img src="<?php echo get_template_directory_uri(); ?>/assets/imgs/icons/youtube.svg" alt="youtube"> Youtube</a></li>
                    <li><a href="#"><img src="<?php echo get_template_directory_uri(); ?>/assets/imgs/icons/github.svg" alt="github"> Github</a></li>
                </ul>
            </div>
            <hr class="footer-line">
            <div class="footer-logo">
                <h4>Company</h4>
                <a href="/">
                    <img src="<?php echo get_template_directory_uri(); ?>/assets/imgs/logo.png" alt="logo">
                    <h2><span class="text-amber-400 dark:text-amber-600">i</span><span class="text-violet-100 dark:text-violet-500">Leads</span><span class="text-yellow-400 dark:text-red-600">Pro</span></h2>
                    <p class="description"><?php echo get_bloginfo('description'); ?></p>
                </a>
            </div>
        </div>
    </div>
    <div class="footer-copyright wrapper">
        <hr>
        <div class="flex flex-col md:flex-row items-center justify-between px-4">
            <p>©<?php echo date('Y'); ?> iLeadsPro.com, All Rights Reserved.</p>
            <p>Powered by SDN Technology</p>
        </div>
    </div>
</footer>
<?php wp_footer(); ?>
</body>

</html>