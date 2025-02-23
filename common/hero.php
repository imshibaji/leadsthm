<div id="hero" class="mt-18 bg-blue-100 dark:bg-gray-800">
    <div class="max-w-7xl mx-auto px-6 py-16 flex flex-col md:flex-row items-center justify-between">

        <!-- Left Section -->
        <div class="md:w-1/2 text-center md:text-left">
            <h1 class="!text-3xl font-bold leading-tight"><?php echo esc_html(get_theme_mod('hero_banner_title', 'Best Usefull title section')); ?></h1>
            <p class="mt-4 text-lg">
                <?php echo get_theme_mod('hero_banner_description', '<a href="#" class="link">Join now More than a hundred</a> small businesses are using iLeadsPro to manage their leads, quotations, invoices, and more.'); ?>
            </p>

            <div class="mt-6 flex flex-row justify-center md:justify-normal gap-4">
                <a href="<?php echo esc_url(get_theme_mod('hero_banner_download_link', '#')); ?>" class="bg-indigo-600 text-white font-semibold px-9 py-3 rounded-full shadow-md hover:bg-indigo-700 transition">
                    <?php echo esc_html(get_theme_mod('hero_banner_download_text', '(Free) Download Now')); ?>
                    <i class="<?php echo esc_html(get_theme_mod('hero_banner_download_icon', 'fa fa-solid fa-download')); ?>"></i>
                </a>
                <a href="<?php echo esc_url(get_theme_mod('hero_banner_premium_demo_link', '#')); ?>" class="border-2 border-gray-700 text-gray-900 dark:text-gray-100 dark:hover:text-gray-900 font-semibold px-6 py-3 rounded-full shadow-md hover:bg-blue-200 transition">
                    <?php echo esc_html(get_theme_mod('hero_banner_premium_demo_text', 'Book Demo For Premium')); ?>
                </a>
            </div>

            <p class="mt-4 text-sm"><?php echo get_theme_mod('hero_banner_highlight', 'Book Demo For Premium'); ?></p>

            <div class="mt-6 justify-center md:justify-normal flex flex-wrap gap-6 text-gray-500 text-sm">
                <?php echo get_theme_mod('hero_banner_highlights', '<p><i class="fa fa-solid fa-check"></i> Manage Leads</p><p><i class="fa fa-solid fa-check"></i> Manage Quotations</p><p><i class="fa fa-solid fa-check"></i> Manage Invoices</p><p><i class="fa fa-solid fa-check"></i> Manage Payments</p>'); ?>
            </div>
        </div>

        <!-- Right Section (Image) -->
        <div class="md:w-1/2 mt-10 md:mt-0 flex justify-center">
            <div class="<?php echo esc_html(get_theme_mod('hero_banner_image_style', 'circle')); ?>">
                <img src="<?php echo esc_url(get_theme_mod('hero_banner_image', get_template_directory_uri() . '/assets/imgs/ileadsPro-Business-Owner.jpg')) ?>" alt="<?php echo esc_html(get_theme_mod('hero_banner_title', 'iLeadsPro Software'));  ?>" class="object-cover w-full h-full">
            </div>
        </div>

    </div>
</div>