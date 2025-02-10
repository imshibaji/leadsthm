<footer class="footer">
    <div class="wrapper">
        <div class="footer-content">
            <div class="footer-menu">
                <h4>Quick Links</h4>
                <?php
                    wp_nav_menu(array(
                        'theme_location' => 'footer_menu',
                        'menu_class'     => '',
                        'menu_id'        => '',
                        'container'      => '',
                        'container_class' => ''
                    ));
                ?>
            </div>
            <hr class="footer-line">
            <div class="footer-menu">
                <h4>Quick Links</h4>
                <?php
                    wp_nav_menu(array(
                        'theme_location' => 'footer_menu_2',
                        'menu_class'     => '',
                        'menu_id'        => '',
                        'container'      => '',
                        'container_class' => ''
                    ));
                ?>
            </div>
            <hr class="footer-line">
            <div class="footer-social">
                <h4>Follow Us</h4>
                <?php
                    wp_nav_menu(array(
                        'theme_location' => 'social_menu',
                        'menu_class'     => '',
                        'menu_id'        => '',
                        'container'      => '',
                        'container_class' => ''
                    ));
                ?>
            </div>
            <hr class="footer-line">
            <div class="footer-logo">
                <h4>Company</h4>
                <a href="/">
                    <?php if ( has_custom_logo() ): ?>
                       <?php the_custom_logo(); ?>
                    <?php else: ?>
                        <img src="<?php echo get_template_directory_uri(); ?>/assets/imgs/logo.png" alt="logo">
                    <?php endif; ?>
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